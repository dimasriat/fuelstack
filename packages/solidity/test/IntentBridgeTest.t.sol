// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {OpenGate} from "../src/OpenGate.sol";
import {FillGate} from "../src/FillGate.sol";
import {ChainRegistry} from "../src/ChainRegistry.sol";
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
    ChainRegistry public chainRegistry;
    MockERC20 public usdc;
    MockERC20 public sbtc;

    address public oracle = address(0x999);
    address public user = address(0x1);
    address public solver = address(0x2);
    address public recipient = address(0x3);

    uint256 constant FILL_GRACE_PERIOD = 5 minutes;
    uint256 constant ETHEREUM_CHAIN_ID = 1;
    uint256 constant POLYGON_CHAIN_ID = 137;
    uint256 constant CURRENT_CHAIN_ID = 31337; // Foundry default

    function setUp() public {
        // Deploy chain registry first
        chainRegistry = new ChainRegistry(oracle);

        // Add test chains
        vm.startPrank(oracle);
        chainRegistry.addChain(ETHEREUM_CHAIN_ID, "Ethereum", 10 minutes);
        chainRegistry.addChain(POLYGON_CHAIN_ID, "Polygon", 3 minutes);
        vm.stopPrank();

        // Deploy contracts
        openGate = new OpenGate(oracle, address(chainRegistry));
        fillGate = new FillGate(oracle); // Now takes admin address directly
        usdc = new MockERC20("USD Coin", "USDC");
        sbtc = new MockERC20("Stacks BTC", "sBTC");

        // Add test chains to FillGate's embedded chain management
        vm.startPrank(oracle);
        fillGate.addChain(ETHEREUM_CHAIN_ID, "Ethereum", 10 minutes);
        fillGate.addChain(POLYGON_CHAIN_ID, "Polygon", 3 minutes);
        vm.stopPrank();

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
            address(0), // tokenOut = native
            amountOut,
            recipient,
            fillDeadline,
            ETHEREUM_CHAIN_ID // sourceChainId
        );
        vm.stopPrank();

        assertEq(orderId, 0);
        assertEq(openGate.orderStatus(orderId), "OPENED");

        // Step 2: Solver fills with native token
        uint256 recipientBalanceBefore = recipient.balance;

        vm.prank(solver);
        fillGate.fill{value: amountOut}(
            orderId,
            address(0), // tokenOut = native
            amountOut,
            recipient,
            solver,
            fillDeadline,
            ETHEREUM_CHAIN_ID // sourceChainId
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
            address(sbtc), // tokenOut = sBTC
            amountOut,
            recipient,
            fillDeadline,
            POLYGON_CHAIN_ID // sourceChainId (different chain)
        );
        vm.stopPrank();

        // Step 2: Solver fills with sBTC
        vm.startPrank(solver);
        sbtc.approve(address(fillGate), amountOut);
        fillGate.fill(
            orderId,
            address(sbtc), // tokenOut = sBTC
            amountOut,
            recipient,
            solver,
            fillDeadline,
            POLYGON_CHAIN_ID // sourceChainId (different chain)
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
            0, user, address(usdc), amountIn, address(sbtc), amountOut, recipient, fillDeadline, CURRENT_CHAIN_ID
        );

        openGate.open(address(usdc), amountIn, address(sbtc), amountOut, recipient, fillDeadline, CURRENT_CHAIN_ID);
        vm.stopPrank();
    }

    function test_Fill_EmitsEventWithTokenOut() public {
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.expectEmit(true, true, true, true);
        emit FillGate.OrderFilled(0, solver, address(0), amountOut, recipient, solver, fillDeadline, CURRENT_CHAIN_ID);

        vm.prank(solver);
        fillGate.fill{value: amountOut}(0, address(0), amountOut, recipient, solver, fillDeadline, CURRENT_CHAIN_ID);
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
            address(sbtc), // Specify sBTC but send native
            amountOut,
            recipient,
            solver,
            fillDeadline,
            CURRENT_CHAIN_ID
        );
    }

    function test_Revert_Fill_ERC20WithNativeValue() public {
        uint256 amountOut = 0.01e8;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(solver);
        sbtc.approve(address(fillGate), amountOut);

        // Try to send native with ERC20 fill
        vm.expectRevert("Should not send native token for ERC20 fill");
        fillGate.fill{value: 0.01 ether}(0, address(sbtc), amountOut, recipient, solver, fillDeadline, CURRENT_CHAIN_ID);
        vm.stopPrank();
    }

    function test_Revert_Fill_IncorrectNativeAmount() public {
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.expectRevert("Incorrect native amount sent");
        vm.prank(solver);
        fillGate.fill{value: 0.03 ether}(0, address(0), amountOut, recipient, solver, fillDeadline, CURRENT_CHAIN_ID);
    }

    function test_Revert_Fill_InsufficientERC20Allowance() public {
        uint256 amountOut = 0.01e8;
        uint256 fillDeadline = block.timestamp + 1 hours;

        // Don't approve - should fail
        vm.expectRevert();
        vm.prank(solver);
        fillGate.fill(0, address(sbtc), amountOut, recipient, solver, fillDeadline, CURRENT_CHAIN_ID);
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
            fillDeadline,
            ETHEREUM_CHAIN_ID // Use Ethereum chain with 10 minute grace period
        );
        vm.stopPrank();

        vm.warp(fillDeadline + 10 minutes + 1); // Use Ethereum grace period

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
        uint256 orderId =
            openGate.open(address(usdc), amountIn, address(sbtc), amountOut, recipient, fillDeadline, CURRENT_CHAIN_ID);
        vm.stopPrank();

        OpenGate.Order memory order = openGate.getOrder(orderId);

        assertEq(order.sender, user);
        assertEq(order.tokenIn, address(usdc));
        assertEq(order.amountIn, amountIn);
        assertEq(order.tokenOut, address(sbtc));
        assertEq(order.amountOut, amountOut);
        assertEq(order.recipient, recipient);
        assertEq(order.fillDeadline, fillDeadline);
        assertEq(order.sourceChainId, CURRENT_CHAIN_ID);
    }

    function test_MultipleOrders_SequentialIds() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.startPrank(user);
        usdc.approve(address(openGate), amountIn * 3);

        uint256 id1 =
            openGate.open(address(usdc), amountIn, address(0), amountOut, recipient, fillDeadline, CURRENT_CHAIN_ID);
        uint256 id2 =
            openGate.open(address(usdc), amountIn, address(sbtc), amountOut, recipient, fillDeadline, ETHEREUM_CHAIN_ID);
        uint256 id3 =
            openGate.open(address(usdc), amountIn, address(0), amountOut, recipient, fillDeadline, POLYGON_CHAIN_ID);

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
        uint256 orderId =
            openGate.open(address(usdc), amountIn, address(0), amountOut, recipient, fillDeadline, CURRENT_CHAIN_ID);
        vm.stopPrank();

        vm.warp(fillDeadline + FILL_GRACE_PERIOD + 1);

        vm.prank(oracle);
        openGate.settle(orderId, solver);

        vm.expectRevert("Order not in OPENED status");
        vm.prank(user);
        openGate.refund(orderId);
    }

    // ============================================
    // MULTI-CHAIN SPECIFIC TESTS
    // ============================================

    function test_MultiChain_DifferentGracePeriods() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        // Create order from Ethereum (10 min grace period)
        vm.startPrank(user);
        usdc.approve(address(openGate), amountIn * 2);
        uint256 ethOrderId =
            openGate.open(address(usdc), amountIn, address(0), amountOut, recipient, fillDeadline, ETHEREUM_CHAIN_ID);

        // Create order from Polygon (3 min grace period)
        uint256 polyOrderId =
            openGate.open(address(usdc), amountIn, address(0), amountOut, recipient, fillDeadline, POLYGON_CHAIN_ID);
        vm.stopPrank();

        // Warp to after Polygon grace period but before Ethereum grace period
        vm.warp(fillDeadline + 5 minutes);

        // Polygon order should be refundable
        vm.prank(user);
        openGate.refund(polyOrderId);
        assertEq(openGate.orderStatus(polyOrderId), "REFUNDED");

        // Ethereum order should NOT be refundable yet
        vm.expectRevert("Cannot refund yet, fill window still open");
        vm.prank(user);
        openGate.refund(ethOrderId);

        // Warp past Ethereum grace period
        vm.warp(fillDeadline + 11 minutes);

        // Now Ethereum order should be refundable
        vm.prank(user);
        openGate.refund(ethOrderId);
        assertEq(openGate.orderStatus(ethOrderId), "REFUNDED");
    }

    function test_MultiChain_InvalidChain() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;
        uint256 invalidChainId = 999999;

        vm.startPrank(user);
        usdc.approve(address(openGate), amountIn);

        vm.expectRevert("Invalid or inactive source chain");
        openGate.open(address(usdc), amountIn, address(0), amountOut, recipient, fillDeadline, invalidChainId);
        vm.stopPrank();
    }

    function test_MultiChain_FillWithWrongChain() public {
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;
        uint256 wrongChainId = 999999;

        vm.expectRevert("Invalid or inactive source chain");
        vm.prank(solver);
        fillGate.fill{value: amountOut}(0, address(0), amountOut, recipient, solver, fillDeadline, wrongChainId);
    }

    function test_MultiChain_ChainDeactivation() public {
        uint256 amountIn = 100e18;
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        // Deactivate Ethereum chain in both places
        vm.startPrank(oracle);
        chainRegistry.deactivateChain(ETHEREUM_CHAIN_ID);
        fillGate.deactivateChain(ETHEREUM_CHAIN_ID);
        vm.stopPrank();

        vm.startPrank(user);
        usdc.approve(address(openGate), amountIn);

        vm.expectRevert("Invalid or inactive source chain");
        openGate.open(address(usdc), amountIn, address(0), amountOut, recipient, fillDeadline, ETHEREUM_CHAIN_ID);
        vm.stopPrank();

        // Reactivate and try again
        vm.startPrank(oracle);
        chainRegistry.activateChain(ETHEREUM_CHAIN_ID);
        fillGate.activateChain(ETHEREUM_CHAIN_ID);
        vm.stopPrank();

        vm.startPrank(user);
        uint256 orderId =
            openGate.open(address(usdc), amountIn, address(0), amountOut, recipient, fillDeadline, ETHEREUM_CHAIN_ID);
        vm.stopPrank();

        assertEq(openGate.orderStatus(orderId), "OPENED");
    }

    function test_MultiChain_SourceChainTracking() public {
        uint256 amountOut = 0.05 ether;
        uint256 fillDeadline = block.timestamp + 1 hours;

        vm.prank(solver);
        fillGate.fill{value: amountOut}(0, address(0), amountOut, recipient, solver, fillDeadline, POLYGON_CHAIN_ID);

        assertEq(fillGate.getOrderSourceChain(0), POLYGON_CHAIN_ID);
    }
}
