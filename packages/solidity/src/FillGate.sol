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
        string recipient,
        uint256 fillDeadline
    );

    function fill(
        bytes32 orderId,
        address tokenIn,
        uint256 amountIn,
        uint256 amountOut,
        string calldata recipient,
        uint256 fillDeadline
    ) external payable {
        // Validasi orderId harus match dengan parameter yang diberikan
        bytes32 computedOrderId = sha256(
            abi.encode(
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
        // Parse address dari string recipient
        address recipientAddr = parseAddress(recipient);
        (bool success, ) = recipientAddr.call{value: msg.value}("");
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
            fillDeadline
        );
    }

    function parseAddress(string calldata addr) internal pure returns (address) {
        bytes memory addrBytes = bytes(addr);
        require(addrBytes.length == 42, "Invalid address length"); // "0x" + 40 chars
        
        bytes memory addressBytes = new bytes(20);
        for (uint i = 0; i < 20; i++) {
            addressBytes[i] = bytes1(
                hexCharToByte(addrBytes[2 + i * 2]) * 16 +
                hexCharToByte(addrBytes[3 + i * 2])
            );
        }
        
        return address(uint160(bytes20(addressBytes)));
    }

    function hexCharToByte(bytes1 char) internal pure returns (uint8) {
        uint8 byteValue = uint8(char);
        if (byteValue >= uint8(bytes1('0')) && byteValue <= uint8(bytes1('9'))) {
            return byteValue - uint8(bytes1('0'));
        } else if (byteValue >= uint8(bytes1('a')) && byteValue <= uint8(bytes1('f'))) {
            return 10 + byteValue - uint8(bytes1('a'));
        } else if (byteValue >= uint8(bytes1('A')) && byteValue <= uint8(bytes1('F'))) {
            return 10 + byteValue - uint8(bytes1('A'));
        }
        revert("Invalid hex character");
    }
}
