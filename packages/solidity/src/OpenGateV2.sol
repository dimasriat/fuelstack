// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title OpenGateV2
/// @notice EVM → Stacks cross-chain intent bridge
/// @dev Isolated deployment per source chain, always fills on Stacks destination
contract OpenGateV2 {
    bytes32 public constant UNKNOWN = "";
    bytes32 public constant OPENED = "OPENED";
    bytes32 public constant SETTLED = "SETTLED";
    bytes32 public constant REFUNDED = "REFUNDED";

    uint256 public constant FILL_GRACE_PERIOD = 5 minutes;

    address public trustedOracle;
    uint256 public orderCounter;

    struct Order {
        address sender;
        address tokenIn;
        uint256 amountIn;
        address tokenOut; // destination token (address(0) for native STX)
        uint256 amountOut;
        string recipient;  // Stacks principal address (e.g., "ST1E5EJ7...")
        uint256 fillDeadline;
        uint256 sourceChainId;
    }

    mapping(uint256 => bytes32) public orderStatus;
    mapping(uint256 => Order) public orders;

    event OrderOpened(
        uint256 indexed orderId,
        address indexed sender,
        address indexed tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut,
        string recipient,  // Stacks address
        uint256 fillDeadline,
        uint256 sourceChainId
    );

    event OrderSettled(uint256 indexed orderId, address indexed solverRecipient, uint256 sourceChainId);

    event OrderRefunded(uint256 indexed orderId, address indexed sender);

    constructor(address _trustedOracle) {
        trustedOracle = _trustedOracle;
        orderCounter = 0;
    }

    /// @notice Open a new EVM→Stacks cross-chain order
    /// @param tokenIn Token to lock on source EVM chain
    /// @param amountIn Amount to lock
    /// @param tokenOut Token to receive on Stacks (address(0) for native STX)
    /// @param amountOut Amount to receive on Stacks
    /// @param recipient Stacks principal address (e.g., "ST1E5EJ7...")
    /// @param fillDeadline Deadline for solver to fill
    /// @return orderId The sequential order ID
    function open(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 amountOut,
        string calldata recipient,
        uint256 fillDeadline
    ) external returns (uint256) {
        // Validate Stacks recipient format (must start with 'S' for testnet/mainnet)
        require(bytes(recipient).length > 0, "Recipient cannot be empty");
        require(bytes(recipient)[0] == 'S', "Invalid Stacks address");

        uint256 orderId = orderCounter++;

        if (orderStatus[orderId] != UNKNOWN) {
            revert("Order already exists");
        }

        // sourceChainId is always the chain this contract is deployed on
        uint256 sourceChainId = block.chainid;

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
    /// @param solverRecipient Address to send locked tokens to (solver's EVM address on origin chain)
    function settle(uint256 orderId, address solverRecipient) external {
        require(msg.sender == trustedOracle, "Unauthorized");

        if (orderStatus[orderId] != OPENED) {
            revert("Order not in OPENED status");
        }

        orderStatus[orderId] = SETTLED;

        Order memory order = orders[orderId];
        IERC20(order.tokenIn).transfer(solverRecipient, order.amountIn);

        emit OrderSettled(orderId, solverRecipient, order.sourceChainId);
    }

    /// @notice Refund an unfilled order after grace period
    /// @param orderId The order ID to refund
    function refund(uint256 orderId) external {
        Order memory order = orders[orderId];

        require(msg.sender == order.sender || msg.sender == trustedOracle, "Only sender or oracle can refund");

        // Use constant grace period for this chain
        if (block.timestamp <= order.fillDeadline + FILL_GRACE_PERIOD) {
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
