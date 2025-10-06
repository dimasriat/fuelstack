// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract OpenGate {
    uint256 public number;

    bytes32 public constant UNKNOWN = "";
    bytes32 public constant OPENED = "OPENED";
    bytes32 public constant SETTLED = "SETTLED";
    bytes32 public constant REFUNDED = "REFUNDED";

    uint256 public constant FILL_GRACE_PERIOD = 5 minutes;

    struct Order {
        address sender;
        address tokenIn;
        uint256 amountIn;
        uint256 amountOut;
        string recipient;
        uint256 fillDeadline;
    }

    mapping(bytes32 => bytes32) public orderStatus;
    mapping(bytes32 => Order) public orders;

    event OrderOpened(
        bytes32 indexed orderId,
        address indexed tokenIn,
        address sender,
        uint256 amountIn,
        uint256 amountOut,
        string recipient,
        uint256 fillDeadline
    );

    event OrderRefunded(bytes32 indexed orderId, address indexed recipient);

    function open(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOut,
        string calldata recipient,
        uint256 fillDeadline
    ) external {
        bytes32 orderId = sha256(
            abi.encode(
                tokenIn,
                amountIn,
                amountOut,
                recipient,
                fillDeadline
            )
        );

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

        IERC20(tokenIn).transferFrom(
            msg.sender,
            address(this),
            amountIn
        );

        emit OrderOpened(
            orderId,
            tokenIn,
            msg.sender,
            amountIn,
            amountOut,
            recipient,
            fillDeadline
        );
    }

    function refund(bytes32 orderId) external {
        Order memory order = orders[orderId];

        // User hanya bisa refund setelah grace period
        if (block.timestamp <= order.fillDeadline + FILL_GRACE_PERIOD) {
            revert("Cannot refund yet, fill window still open");
        }

        if (orderStatus[orderId] != OPENED) {
            revert("Order not in OPENED status");
        }

        orderStatus[orderId] = REFUNDED;

        IERC20(order.tokenIn).transfer(order.sender, order.amountIn);

        emit OrderRefunded(orderId, msg.sender);
    }
}
