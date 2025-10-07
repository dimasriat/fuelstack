// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract FillGate {
    bytes32 public constant UNKNOWN = "";
    bytes32 public constant FILLED = "FILLED";

    uint256 public constant FILL_GRACE_PERIOD = 5 minutes;

    mapping(uint256 => bytes32) public orderStatus;

    event OrderFilled(
        uint256 indexed orderId,
        address indexed solver,
        uint256 amountOut,
        address recipient,
        address solverOriginAddress,
        uint256 fillDeadline
    );

    function fill(
        uint256 orderId,
        uint256 amountOut,
        address recipient,
        address solverOriginAddress,
        uint256 fillDeadline
    ) external payable {
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
            amountOut,
            recipient,
            solverOriginAddress,
            fillDeadline
        );
    }

    function getOrderStatus(uint256 orderId) external view returns (bytes32) {
        return orderStatus[orderId];
    }
}
