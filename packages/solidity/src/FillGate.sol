// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract FillGate {
    bytes32 public constant UNKNOWN = "";
    bytes32 public constant FILLED = "FILLED";

    uint256 public constant FILL_GRACE_PERIOD = 5 minutes;

    mapping(uint256 => bytes32) public orderStatus;

    event OrderFilled(
        uint256 indexed orderId,
        address indexed solver,
        address indexed tokenOut,
        uint256 amountOut,
        address recipient,
        address solverOriginAddress,
        uint256 fillDeadline
    );

    /// @notice Fill an order with native token or ERC20
    /// @param orderId The order ID from OpenGate
    /// @param tokenOut Address of token to send (address(0) for native)
    /// @param amountOut Amount to send
    /// @param recipient Address to receive tokens
    /// @param solverOriginAddress Solver's address on origin chain (for settlement)
    /// @param fillDeadline Order deadline
    function fill(
        uint256 orderId,
        address tokenOut,
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

        // Update status BEFORE transfer (CEI pattern)
        orderStatus[orderId] = FILLED;

        // Transfer logic
        if (tokenOut == address(0)) {
            // Native token (ETH/gas token)
            if (msg.value != amountOut) {
                revert("Incorrect native amount sent");
            }
            
            (bool success, ) = recipient.call{value: msg.value}("");
            if (!success) {
                revert("Native transfer failed");
            }
        } else {
            // ERC20 token
            if (msg.value != 0) {
                revert("Should not send native token for ERC20 fill");
            }
            
            // Transfer from solver to recipient
            IERC20(tokenOut).transferFrom(msg.sender, recipient, amountOut);
        }

        emit OrderFilled(
            orderId,
            msg.sender,
            tokenOut,
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
