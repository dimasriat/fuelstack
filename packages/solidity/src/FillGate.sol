// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract FillGate {
    bytes32 public constant UNKNOWN = "";
    bytes32 public constant FILLED = "FILLED";

    mapping(bytes32 => bytes32) public orderStatus;

    uint256 public constant FILL_GRACE_PERIOD = 5 minutes;

    event OrderFilled(
        bytes32 indexed orderId,
        address indexed solver,
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut,
        address recipient,
        address solverOriginAddress,
        uint256 fillDeadline
    );

    function fill(
        bytes32 orderId,
        address sender,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOut,
        address recipient,
        address solverOriginAddress,
        uint256 fillDeadline
    ) external payable {
        // Validasi orderId harus match dengan parameter yang diberikan
        bytes32 computedOrderId = sha256(
            abi.encode(
                sender,
                tokenIn,
                amountIn,
                amountOut,
                recipient,
                fillDeadline
            )
        );

        if (computedOrderId != orderId) {
            revert("Invalid orderId");
        }

        // Order belum pernah di-fill
        if (orderStatus[orderId] != UNKNOWN) {
            revert("Order already filled");
        }

        // Validasi deadline
        if (block.timestamp > fillDeadline + FILL_GRACE_PERIOD) {
            revert("Fill deadline exceeded");
        }
        // Validasi jumlah native token yang dikirim
        if (msg.value != amountOut) {
            revert("Incorrect amount sent");
        }

        // Update status
        orderStatus[orderId] = FILLED;

        // Transfer native token ke recipient
        (bool success, ) = recipient.call{value: msg.value}("");
        if (!success) {
            revert("Transfer failed");
        }

        emit OrderFilled(
            orderId,
            msg.sender,
            tokenIn,
            amountIn,
            amountOut,
            recipient,
            solverOriginAddress,
            fillDeadline
        );
    }
}
