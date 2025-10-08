// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ChainRegistry} from "./ChainRegistry.sol";

contract OpenGate {
    bytes32 public constant UNKNOWN = "";
    bytes32 public constant OPENED = "OPENED";
    bytes32 public constant SETTLED = "SETTLED";
    bytes32 public constant REFUNDED = "REFUNDED";

    uint256 public constant FILL_GRACE_PERIOD = 5 minutes;

    address public trustedOracle;
    uint256 public orderCounter;
    ChainRegistry public chainRegistry;

    struct Order {
        address sender;
        address tokenIn;
        uint256 amountIn;
        address tokenOut; // destination token
        uint256 amountOut;
        address recipient;
        uint256 fillDeadline;
        uint256 sourceChainId; // NEW: source chain identifier
    }

    mapping(uint256 => bytes32) public orderStatus;
    mapping(uint256 => Order) public orders;

    event OrderOpened( // NEW: source chain identifier
        uint256 indexed orderId,
        address indexed sender,
        address indexed tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut,
        address recipient,
        uint256 fillDeadline,
        uint256 sourceChainId
    );

    event OrderSettled(uint256 indexed orderId, address indexed solverRecipient);

    event OrderRefunded(uint256 indexed orderId, address indexed sender);

    constructor(address _trustedOracle, address _chainRegistry) {
        trustedOracle = _trustedOracle;
        chainRegistry = ChainRegistry(_chainRegistry);
        orderCounter = 0;
    }

    /// @notice Open a new cross-chain order
    /// @param tokenIn Token to lock on origin chain
    /// @param amountIn Amount to lock
    /// @param tokenOut Token to receive on destination chain (address(0) for native)
    /// @param amountOut Amount to receive on destination
    /// @param recipient Address to receive tokens on destination chain
    /// @param fillDeadline Deadline for solver to fill
    /// @param sourceChainId Chain ID where this order originates
    /// @return orderId The sequential order ID
    function open(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut,
        address recipient,
        uint256 fillDeadline,
        uint256 sourceChainId
    ) external returns (uint256) {
        // Validate source chain
        require(chainRegistry.isChainValid(sourceChainId), "Invalid or inactive source chain");

        uint256 orderId = orderCounter++;

        if (orderStatus[orderId] != UNKNOWN) {
            revert("Order already exists");
        }

        orderStatus[orderId] = OPENED;
        orders[orderId] = Order({
            sender: msg.sender,
            tokenIn: tokenIn,
            amountIn: amountIn,
            tokenOut: tokenOut,
            amountOut: amountOut,
            recipient: recipient,
            fillDeadline: fillDeadline,
            sourceChainId: sourceChainId
        });

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        emit OrderOpened(
            orderId, msg.sender, tokenIn, amountIn, tokenOut, amountOut, recipient, fillDeadline, sourceChainId
        );

        return orderId;
    }

    /// @notice Settle a filled order (only callable by oracle)
    /// @param orderId The order ID to settle
    /// @param solverRecipient Address to send locked tokens to (solver's address on origin chain)
    function settle(uint256 orderId, address solverRecipient) external {
        require(msg.sender == trustedOracle, "Unauthorized");

        if (orderStatus[orderId] != OPENED) {
            revert("Order not in OPENED status");
        }

        orderStatus[orderId] = SETTLED;

        Order memory order = orders[orderId];
        IERC20(order.tokenIn).transfer(solverRecipient, order.amountIn);

        emit OrderSettled(orderId, solverRecipient);
    }

    /// @notice Refund an unfilled order after grace period
    /// @param orderId The order ID to refund
    function refund(uint256 orderId) external {
        Order memory order = orders[orderId];

        require(msg.sender == order.sender || msg.sender == trustedOracle, "Only sender or oracle can refund");

        // Use chain-specific grace period
        uint256 gracePeriod = chainRegistry.getGracePeriod(order.sourceChainId);
        if (block.timestamp <= order.fillDeadline + gracePeriod) {
            revert("Cannot refund yet, fill window still open");
        }

        if (orderStatus[orderId] != OPENED) {
            revert("Order not in OPENED status");
        }

        orderStatus[orderId] = REFUNDED;

        IERC20(order.tokenIn).transfer(order.sender, order.amountIn);

        emit OrderRefunded(orderId, order.sender);
    }

    /// @notice Get order details
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
}
