// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {OpenGate} from "../src/OpenGate.sol";
import {FillGate} from "../src/FillGate.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Mock ERC20 token untuk testing
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
        // Deploy contracts
        openGate = new OpenGate(oracle);
        fillGate = new FillGate();
        token = new MockERC20();

        // Setup balances
        token.mint(user, 1000e18);
        vm.deal(solver, 10 ether);

        // Labels untuk readable traces
        vm.label(oracle, "Oracle");
        vm.label(user, "User");
        vm.label(solver, "Solver");
        vm.label(recipient, "Recipient");
    }

    // ============================================
    // HAPPY PATH TESTS
    // ============================================

    function test_E2E_HappyPath() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        // Step 1: User opens order
        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        // Compute orderId (same as contract)
        bytes32 orderId = sha256(
            abi.encode(
                user,
                address(token),
                amountIn,
                amountOut,
                recipient,
                fillDeadline
            )
        );

        // Verify order status
        assertEq(openGate.orderStatus(orderId), "OPENED");
        assertEq(token.balanceOf(address(openGate)), amountIn);

        // Step 2: Solver fills order
        vm.prank(solver);
        fillGate.fill{value: amountOut}(
            orderId,
            user,
            address(token),
            amountIn,
            amountOut,
            recipient,
            solver, // solverOriginAddress
            fillDeadline
        );

        // Verify fill
        assertEq(fillGate.orderStatus(orderId), "FILLED");
        assertEq(recipient.balance, amountOut);

        // Step 3: Oracle settles
        vm.prank(oracle);
        openGate.settle(orderId, solver);

        // Verify settlement
        assertEq(openGate.orderStatus(orderId), "SETTLED");
        assertEq(token.balanceOf(solver), amountIn);
        assertEq(token.balanceOf(address(openGate)), 0);
    }

    function test_Open_EmitsEvent() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        bytes32 orderId = sha256(
            abi.encode(
                user,
                address(token),
                amountIn,
                amountOut,
                recipient,
                fillDeadline
            )
        );

        vm.startPrank(user);
        token.approve(address(openGate), amountIn);

        vm.expectEmit(true, true, false, true);
        emit OpenGate.OrderOpened(
            orderId,
            user,
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );

        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();
    }

    // ============================================
    // REFUND PATH TESTS
    // ============================================

    function test_Refund_AfterGracePeriod() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        // Open order
        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        bytes32 orderId = sha256(
            abi.encode(
                user,
                address(token),
                amountIn,
                amountOut,
                recipient,
                fillDeadline
            )
        );

        // Fast forward past grace period
        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);

        // User refunds
        uint256 userBalanceBefore = token.balanceOf(user);
        vm.prank(user);
        openGate.refund(orderId);

        // Verify refund
        assertEq(openGate.orderStatus(orderId), "REFUNDED");
        assertEq(token.balanceOf(user), userBalanceBefore + amountIn);
        assertEq(token.balanceOf(address(openGate)), 0);
    }

    function test_Refund_OracleCanTrigger() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        bytes32 orderId = sha256(
            abi.encode(
                user,
                address(token),
                amountIn,
                amountOut,
                recipient,
                fillDeadline
            )
        );

        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);

        // Oracle triggers refund
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
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();
    
        bytes32 orderId = sha256(
            abi.encode(
                user,
                address(token),
                amountIn,
                amountOut,
                recipient,
                fillDeadline
            )
        );
    
        // Try refund immediately
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
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();
    
        bytes32 orderId = sha256(
            abi.encode(
                user,
                address(token),
                amountIn,
                amountOut,
                recipient,
                fillDeadline
            )
        );
    
        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);
    
        address attacker = address(0x888);
        vm.expectRevert("Only sender or oracle can refund");
        vm.prank(attacker);
        openGate.refund(orderId);
    }

    // ============================================
    // EDGE CASE TESTS
    // ============================================

    function test_Revert_Open_DuplicateOrder() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        token.approve(address(openGate), amountIn * 2);
        
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );

        // Expect revert dengan exact message
        vm.expectRevert("Order already exists");
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();
    }

    function test_Open_DifferentUsersCanHaveSameParameters() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        address user2 = address(0x10);
        token.mint(user2, 1000e18);

        // User 1 opens order
        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        // User 2 opens order with same parameters (should work!)
        vm.startPrank(user2);
        token.approve(address(openGate), amountIn);
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        // OrderIds should be different
        bytes32 orderId1 = sha256(
            abi.encode(user, address(token), amountIn, amountOut, recipient, fillDeadline)
        );
        bytes32 orderId2 = sha256(
            abi.encode(user2, address(token), amountIn, amountOut, recipient, fillDeadline)
        );

        assertTrue(orderId1 != orderId2);
        assertEq(openGate.orderStatus(orderId1), "OPENED");
        assertEq(openGate.orderStatus(orderId2), "OPENED");
    }

    function test_Revert_Settle_UnauthorizedCaller() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;
    
        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();
    
        bytes32 orderId = sha256(
            abi.encode(user, address(token), amountIn, amountOut, recipient, fillDeadline)
        );
    
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
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        bytes32 orderId = sha256(
            abi.encode(user, address(token), amountIn, amountOut, recipient, fillDeadline)
        );

        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);

        // Oracle settles first
        vm.prank(oracle);
        openGate.settle(orderId, solver);

        // User tries to refund (should fail - already settled)
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
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();

        bytes32 orderId = sha256(
            abi.encode(user, address(token), amountIn, amountOut, recipient, fillDeadline)
        );

        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);

        // User refunds first
        vm.prank(user);
        openGate.refund(orderId);

        // Oracle tries to settle (should fail - already refunded)
        vm.expectRevert("Order not in OPENED status");
        vm.prank(oracle);
        openGate.settle(orderId, solver);
    }

    function test_Revert_Fill_InvalidOrderId() public {
        bytes32 fakeOrderId = keccak256("fake");
    
        vm.expectRevert("Invalid orderId");
        vm.prank(solver);
        fillGate.fill{value: 0.05 ether}(
            fakeOrderId,
            user,
            address(token),
            100e18,
            0.05 ether,
            recipient,
            solver,
            block.timestamp + 1 hours
        );
    }

    function test_Revert_Fill_IncorrectAmount() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;
    
        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();
    
        bytes32 orderId = sha256(
            abi.encode(user, address(token), amountIn, amountOut, recipient, fillDeadline)
        );
    
        vm.expectRevert("Incorrect amount sent");
        vm.prank(solver);
        fillGate.fill{value: 0.03 ether}(
            orderId,
            user,
            address(token),
            amountIn,
            amountOut,
            recipient,
            solver,
            fillDeadline
        );
    }

    function test_Revert_Fill_AfterDeadlineWithGrace() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;
    
        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();
    
        bytes32 orderId = sha256(
            abi.encode(user, address(token), amountIn, amountOut, recipient, fillDeadline)
        );
    
        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);
    
        vm.expectRevert("Fill deadline exceeded");
        vm.prank(solver);
        fillGate.fill{value: amountOut}(
            orderId,
            user,
            address(token),
            amountIn,
            amountOut,
            recipient,
            solver,
            fillDeadline
        );
    }

    function test_Revert_Fill_DoubleFill() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;
    
        vm.startPrank(user);
        token.approve(address(openGate), amountIn);
        openGate.open(
            address(token),
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
        vm.stopPrank();
    
        bytes32 orderId = sha256(
            abi.encode(user, address(token), amountIn, amountOut, recipient, fillDeadline)
        );
    
        // First fill
        vm.prank(solver);
        fillGate.fill{value: amountOut}(
            orderId,
            user,
            address(token),
            amountIn,
            amountOut,
            recipient,
            solver,
            fillDeadline
        );
    
        // Second fill
        address solver2 = address(0x20);
        vm.deal(solver2, 1 ether);
        
        vm.expectRevert("Order already filled");
        vm.prank(solver2);
        fillGate.fill{value: amountOut}(
            orderId,
            user,
            address(token),
            amountIn,
            amountOut,
            recipient,
            solver2,
            fillDeadline
        );
    }
}
