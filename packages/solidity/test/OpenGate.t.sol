// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {OpenGate} from "../src/OpenGate.sol";

contract OpenGateTest is Test {
    OpenGate public counter;

    function setUp() public {
        counter = new OpenGate();
        // counter.setNumber(0);
    }

    function test_open() public {
        counter.setNumber(42);
        assertEq(counter.number(), 42);
    }

    // function test_Increment() public {
    //     counter.increment();
    //     assertEq(counter.number(), 1);
    // }

    // function testFuzz_SetNumber(uint256 x) public {
    //     counter.setNumber(x);
    //     assertEq(counter.number(), x);
    // }
}
