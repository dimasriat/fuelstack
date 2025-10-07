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
    string public name;
    string public symbol;
    uint8 public decimals = 18;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

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
    MockERC20 public usdc;
    MockERC20 public sbtc;

    address public oracle = address(0x999);
    address public user = address(0x1);
    address public solver = address(0x2);
    address public recipient = address(0x3);

    uint256 constant FILL_GRACE_PERIOD = 5 minutes;

    function setUp() public {
        openGate = new OpenGate(oracle);
        fillGate = new FillGate();
        usdc = new MockERC20("USD Coin", "USDC");
        sbtc = new MockERC20("Stacks BTC", "sBTC");

        // Setup balances
        usdc.mint(user, 10000e18);
        sbtc.mint(solver, 100e8); // sBTC usually 8 decimals
        vm.deal(solver, 10 ether);
        vm.deal(user, 1 ether);

        // Labels
        vm.label(oracle, "Oracle");
        vm.label(user, "User");
        vm.label(solver, "Solver");
        vm.label(recipient, "Recipient");
        vm.label(address(usdc), "USDC");
        vm.label(address(sbtc), "sBTC");
    }

    // ============================================
    // NATIVE TOKEN TESTS (Gas Refuel Use Case)
    // ============================================

    function test_E2E_NativeToken_GasRefuel() public {
        uint256 amountIn = 100e18; // 100 USDC
        uint256 amountOut = 0.05 ether; // 0.05 ETH/STX
        uint256 fillDeadline = block.timestamp + 1 hours;

        // Step 1: User opens order for native token
        vm.startPrank(user);
        usdc.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(usdc),
            amountIn,
            address(0),      // tokenOut = native
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        assertEq(orderId, 0);
        assertEq(openGate.orderStatus(orderId), "OPENED");

        // Step 2: Solver fills with native token
        uint256 recipientBalanceBefore = recipient.balance;
        
        vm.prank(solver);
        fillGate.fill{value: amountOut}(
            orderId,
            address(0),      // tokenOut = native
            amountOut,
            recipient,
            solver,
            fillDeadline
        );

        assertEq(fillGate.orderStatus(orderId), "FILLED");
        assertEq(recipient.balance, recipientBalanceBefore + amountOut);

        // Step 3: Oracle settles
        vm.prank(oracle);
        openGate.settle(orderId, solver);

        assertEq(openGate.orderStatus(orderId), "SETTLED");
        assertEq(usdc.balanceOf(solver), amountIn);
    }

    // ============================================
    // ERC20 TOKEN TESTS (sBTC Use Case)
    // ============================================

    function test_E2E_ERC20Token_sBTC() public {
        uint256 amountIn = 100e18; // 100 USDC
        uint256 amountOut = 0.01e8; // 0.01 sBTC (8 decimals)
        uint256 fillDeadline = block.timestamp + 1 hours;

        // Step 1: User opens order for sBTC
        vm.startPrank(user);
        usdc.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(usdc),
            amountIn,
            address(sbtc),   // tokenOut = sBTC
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        // Step 2: Solver fills with sBTC
        vm.startPrank(solver);
        sbtc.approve(address(fillGate), amountOut);
        fillGate.fill(
            orderId,
            address(sbtc),   // tokenOut = sBTC
            amountOut,
            recipient,
            solver,
            fillDeadline
        );
        vm.stopPrank();

        assertEq(fillGate.orderStatus(orderId), "FILLED");
        assertEq(sbtc.balanceOf(recipient), amountOut);

        // Step 3: Oracle settles
        vm.prank(oracle);
        openGate.settle(orderId, solver);

        assertEq(openGate.orderStatus(orderId), "SETTLED");
        assertEq(usdc.balanceOf(solver), amountIn);
    }

    function test_Open_EmitsEventWithTokenOut() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.01e8;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        usdc.approve(address(openGate), amountIn);

        vm.expectEmit(true, true, true, true);
        emit OpenGate.OrderOpened(
            0,
            user,
            address(usdc),
            amountIn,
            address(sbtc),
            amountOut,
            recipient,
            fillDeadline
        );

        openGate.open(
            address(usdc),
            amountIn,
            address(sbtc),
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();
    }

    function test_Fill_EmitsEventWithTokenOut() public {
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.expectEmit(true, true, true, true);
        emit FillGate.OrderFilled(
            0,
            solver,
            address(0),
            amountOut,
            recipient,
            solver,
            fillDeadline
        );

        vm.prank(solver);
        fillGate.fill{value: amountOut}(
            0,
            address(0),
            amountOut,
            recipient,
            solver,
            fillDeadline
        );
    }

    // ============================================
    // ERROR CASES
    // ============================================

    function test_Revert_Fill_NativeWithERC20Parameter() public {
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        // Try to send native but specify ERC20 address
        vm.expectRevert("Should not send native token for ERC20 fill");
        vm.prank(solver);
        fillGate.fill{value: amountOut}(
            0,
            address(sbtc),   // Specify sBTC but send native
            amountOut,
            recipient,
            solver,
            fillDeadline
        );
    }

    function test_Revert_Fill_ERC20WithNativeValue() public {
        uint256 amountOut = 0.01e8;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(solver);
        sbtc.approve(address(fillGate), amountOut);

        // Try to send native with ERC20 fill
        vm.expectRevert("Should not send native token for ERC20 fill");
        fillGate.fill{value: 0.01 ether}(
            0,
            address(sbtc),
            amountOut,
            recipient,
            solver,
            fillDeadline
        );
        vm.stopPrank();
    }

    function test_Revert_Fill_IncorrectNativeAmount() public {
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.expectRevert("Incorrect native amount sent");
        vm.prank(solver);
        fillGate.fill{value: 0.03 ether}(
            0,
            address(0),
            amountOut,
            recipient,
            solver,
            fillDeadline
        );
    }

    function test_Revert_Fill_InsufficientERC20Allowance() public {
        uint256 amountOut = 0.01e8;
        uint256 fillDeadline = block.timestamp + 1 hours;

        // Don't approve - should fail
        vm.expectRevert();
        vm.prank(solver);
        fillGate.fill(
            0,
            address(sbtc),
            amountOut,
            recipient,
            solver,
            fillDeadline
        );
    }

    // ============================================
    // REFUND & SETTLEMENT TESTS
    // ============================================

    function test_Refund_AfterGracePeriod() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        usdc.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(usdc),
            amountIn,
            address(0),
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);

        uint256 userBalanceBefore = usdc.balanceOf(user);
        vm.prank(user);
        openGate.refund(orderId);

        assertEq(openGate.orderStatus(orderId), "REFUNDED");
        assertEq(usdc.balanceOf(user), userBalanceBefore + amountIn);
    }

    function test_GetOrder_ReturnsCorrectData() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.01e8;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        usdc.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(usdc),
            amountIn,
            address(sbtc),
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        OpenGate.Order memory order = openGate.getOrder(orderId);
        
        assertEq(order.sender, user);
        assertEq(order.tokenIn, address(usdc));
        assertEq(order.amountIn, amountIn);
        assertEq(order.tokenOut, address(sbtc));
        assertEq(order.amountOut, amountOut);
        assertEq(order.recipient, recipient);
        assertEq(order.fillDeadline, fillDeadline);
    }

    function test_MultipleOrders_SequentialIds() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        usdc.approve(address(openGate), amountIn * 3);

        uint256 id1 = openGate.open(address(usdc), amountIn, address(0), amountOut, recipient, fillDeadline);
        uint256 id2 = openGate.open(address(usdc), amountIn, address(sbtc), amountOut, recipient, fillDeadline);
        uint256 id3 = openGate.open(address(usdc), amountIn, address(0), amountOut, recipient, fillDeadline);

        vm.stopPrank();

        assertEq(id1, 0);
        assertEq(id2, 1);
        assertEq(id3, 2);
    }

    // ============================================
    // RACE CONDITION TESTS
    // ============================================

    function test_RaceCondition_RefundVsSettle_SettleWins() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        usdc.approve(address(openGate), amountIn);
        uint256 orderId = openGate.open(
            address(usdc),
            amountIn,
            address(0),
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
}
