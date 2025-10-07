// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OpenGate {
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
        uint256 amountOut;
        address recipient;
        uint256 fillDeadline;
    }

    mapping(uint256 => bytes32) public orderStatus;
    mapping(uint256 => Order) public orders;

    event OrderOpened(
        uint256 indexed orderId,
        address indexed sender,
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut,
        address recipient,
        uint256 fillDeadline
    );

    event OrderSettled(uint256 indexed orderId, address indexed solverRecipient);

    event OrderRefunded(uint256 indexed orderId, address indexed sender);

    constructor(address _trustedOracle) {
        trustedOracle = _trustedOracle;
        orderCounter = 0;
    }

    function open(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOut,
        address recipient,
        uint256 fillDeadline
    ) external returns (uint256) {
        uint256 orderId = orderCounter++;

        if (orderStatus[orderId] != UNKNOWN) {
            revert("Order already exists");
        }

        orderStatus[orderId] = OPENED;
        orders[orderId] = Order({
            sender: msg.sender,
            tokenIn: tokenIn,
            amountIn: amountIn,
            amountOut: amountOut,
            recipient: recipient,
            fillDeadline: fillDeadline
        });

        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);

        emit OrderOpened(
            orderId,
            msg.sender,
            tokenIn,
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );

        return orderId;
    }

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

    function refund(uint256 orderId) external {
        Order memory order = orders[orderId];

        require(
            msg.sender == order.sender || msg.sender == trustedOracle,
            "Only sender or oracle can refund"
        );

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

    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
}
