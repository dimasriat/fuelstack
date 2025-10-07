// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {OpenGate} from "../src/OpenGate.sol";
import {FillGate} from "../src/FillGate.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Mock ERC20 token
contract MockERC20 is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string public name = "Mock Token";
    string public symbol = "MOCK";
    uint8 public decimals = 18;

    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        _allowances[from][msg.sender] -= amount;
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}

contract IntentBridgeTest is Test {
    OpenGate public openGate;
    FillGate public fillGate;
    MockERC20 public token;

    address public oracle = address(0x999);
    address public user = address(0x1);
    address public solver = address(0x2);
    address public recipient = address(0x3);

    uint256 constant FILL_GRACE_PERIOD = 5 minutes;

    function setUp() public {
        openGate = new OpenGate(oracle);
        fillGate = new FillGate();
        token = new MockERC20();

        token.mint(user, 1000e18);
        vm.deal(solver, 10 ether);

        vm.label(oracle, "Oracle");
        vm.label(user, "User");
        vm.label(solver, "Solver");
        vm.label(recipient, "Recipient");
    }

    function test_E2E_HappyPath() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        // Step 1: User opens order
        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        // Verify orderId is sequential
        assertEq(orderId, 0);
        assertEq(openGate.orderStatus(orderId), "OPENED");
        assertEq(token.balanceOf(address(openGate)), amountIn);

        // Step 2: Solver fills order
        vm.prank(solver);
        fillGate.fill{value: amountOut}(
            orderId,
            amountOut,
            recipient,
            solver,
            fillDeadline
        );

        assertEq(fillGate.orderStatus(orderId), "FILLED");
        assertEq(recipient.balance, amountOut);

        // Step 3: Oracle settles
        vm.prank(oracle);
        openGate.settle(orderId, solver);

        assertEq(openGate.orderStatus(orderId), "SETTLED");
        assertEq(token.balanceOf(solver), amountIn);
    }

    function test_Open_ReturnsSequentialOrderId() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        token.approve(address(openGate), amountIn * 3);

        uint256 orderId1 = openGate.open(address(token), amountIn, amountOut, recipient, fillDeadline);
        uint256 orderId2 = openGate.open(address(token), amountIn, amountOut, recipient, fillDeadline);
        uint256 orderId3 = openGate.open(address(token), amountIn, amountOut, recipient, fillDeadline);

        vm.stopPrank();

        assertEq(orderId1, 0);
        assertEq(orderId2, 1);
        assertEq(orderId3, 2);
    }

    function test_Open_EmitsEvent() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        token.approve(address(openGate), amountIn);

        vm.expectEmit(true, true, true, true);
        emit OpenGate.OrderOpened(
            0, // orderId
            user,
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );

        openGate.open(address(token), amountIn, amountOut, recipient, fillDeadline);
        vm.stopPrank();
    }

    function test_Refund_AfterGracePeriod() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);

        uint256 userBalanceBefore = token.balanceOf(user);
        vm.prank(user);
        openGate.refund(orderId);

        assertEq(openGate.orderStatus(orderId), "REFUNDED");
        assertEq(token.balanceOf(user), userBalanceBefore + amountIn);
    }

    function test_Refund_OracleCanTrigger() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);

        vm.prank(oracle);
        openGate.refund(orderId);

        assertEq(openGate.orderStatus(orderId), "REFUNDED");
    }

    function test_Revert_Refund_BeforeGracePeriod() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        vm.expectRevert("Cannot refund yet, fill window still open");
        vm.prank(user);
        openGate.refund(orderId);
    }

    function test_Revert_Refund_UnauthorizedUser() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);

        address attacker = address(0x888);
        vm.expectRevert("Only sender or oracle can refund");
        vm.prank(attacker);
        openGate.refund(orderId);
    }

    function test_Revert_Settle_UnauthorizedCaller() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        address attacker = address(0x666);
        vm.expectRevert("Unauthorized");
        vm.prank(attacker);
        openGate.settle(orderId, attacker);
    }

    function test_RaceCondition_RefundVsSettle_SettleWins() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);

        vm.prank(oracle);
        openGate.settle(orderId, solver);

        vm.expectRevert("Order not in OPENED status");
        vm.prank(user);
        openGate.refund(orderId);
    }

    function test_RaceCondition_RefundVsSettle_RefundWins() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);

        vm.prank(user);
        openGate.refund(orderId);

        vm.expectRevert("Order not in OPENED status");
        vm.prank(oracle);
        openGate.settle(orderId, solver);
    }

    function test_Revert_Fill_DoubleFill() public {
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.prank(solver);
        fillGate.fill{value: amountOut}(0, amountOut, recipient, solver, fillDeadline);

        address solver2 = address(0x20);
        vm.deal(solver2, 1 ether);

        vm.expectRevert("Order already filled");
        vm.prank(solver2);
        fillGate.fill{value: amountOut}(0, amountOut, recipient, solver2, fillDeadline);
    }

    function test_Revert_Fill_IncorrectAmount() public {
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.expectRevert("Incorrect amount sent");
        vm.prank(solver);
        fillGate.fill{value: 0.03 ether}(0, amountOut, recipient, solver, fillDeadline);
    }

    function test_Revert_Fill_AfterDeadlineWithGrace() public {
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);

        vm.expectRevert("Fill deadline exceeded");
        vm.prank(solver);
        fillGate.fill{value: amountOut}(0, amountOut, recipient, solver, fillDeadline);
    }
}
