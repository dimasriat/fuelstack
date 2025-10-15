// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {MockERC20} from "../src/MockERC20.sol";

/**
 * @title DeployMockTokens
 * @notice Deployment script for test tokens (USDC, WBTC)
 * @dev Separate from main OpenGateV2 deployment for flexibility
 */
contract DeployMockTokens is Script {
    // Environment variables
    address public deployer;
    address public recipient1; // Can be oracle, solver, or any test address
    address public recipient2; // Optional second recipient

    // Deployed contracts
    MockERC20 public usdc;
    MockERC20 public wbtc;

    function setUp() public {
        deployer = vm.addr(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        // Optional: Set recipient addresses from env or use deployer
        try vm.envUint("ORACLE_PRIVATE_KEY") returns (uint256 oracleKey) {
            recipient1 = vm.addr(oracleKey);
        } catch {
            recipient1 = deployer;
        }

        recipient2 = deployer; // Can be changed as needed
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("=== Mock Token Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Recipient 1:", recipient1);
        console.log("Recipient 2:", recipient2);
        console.log("Chain ID:", block.chainid);

        // 1. Deploy USDC
        console.log("\n1. Deploying USDC (6 decimals)...");
        usdc = new MockERC20("USD Coin", "USDC", 6);
        console.log("USDC deployed at:", address(usdc));

        // 2. Deploy WBTC
        console.log("\n2. Deploying WBTC (8 decimals)...");
        wbtc = new MockERC20("Wrapped Bitcoin", "WBTC", 8);
        console.log("WBTC deployed at:", address(wbtc));

        // 3. Mint tokens
        console.log("\n3. Minting test tokens...");
        mintTestTokens();

        vm.stopBroadcast();

        // 4. Print summary
        printDeploymentSummary();
    }

    function mintTestTokens() internal {
        // Mint USDC (6 decimals)
        usdc.mint(deployer, 1000000 * 10**6); // 1M USDC
        usdc.mint(recipient1, 100000 * 10**6); // 100K USDC
        if (recipient2 != deployer && recipient2 != recipient1) {
            usdc.mint(recipient2, 50000 * 10**6); // 50K USDC
        }

        // Mint WBTC (8 decimals)
        wbtc.mint(deployer, 100 * 10**8); // 100 WBTC
        wbtc.mint(recipient1, 10 * 10**8); // 10 WBTC
        if (recipient2 != deployer && recipient2 != recipient1) {
            wbtc.mint(recipient2, 5 * 10**8); // 5 WBTC
        }

        console.log("Minted USDC:");
        console.log("  Deployer:", deployer, "-> 1,000,000 USDC");
        console.log("  Recipient 1:", recipient1, "-> 100,000 USDC");
        if (recipient2 != deployer && recipient2 != recipient1) {
            console.log("  Recipient 2:", recipient2, "-> 50,000 USDC");
        }

        console.log("\nMinted WBTC:");
        console.log("  Deployer:", deployer, "-> 100 WBTC");
        console.log("  Recipient 1:", recipient1, "-> 10 WBTC");
        if (recipient2 != deployer && recipient2 != recipient1) {
            console.log("  Recipient 2:", recipient2, "-> 5 WBTC");
        }
    }

    function printDeploymentSummary() internal view {
        console.log("\n=================================================");
        console.log("MOCK TOKEN DEPLOYMENT COMPLETE");
        console.log("=================================================");
        console.log("Chain ID:", block.chainid);
        console.log("");
        console.log("Deployed Tokens:");
        console.log("  USDC (6 decimals):", address(usdc));
        console.log("  WBTC (8 decimals):", address(wbtc));
        console.log("");
        console.log("Token Holders:");
        console.log("  Deployer:", deployer);
        console.log("  Recipient 1:", recipient1);
        if (recipient2 != deployer && recipient2 != recipient1) {
            console.log("  Recipient 2:", recipient2);
        }
        console.log("");
        console.log("Next Steps:");
        console.log("  1. Update config files with token addresses");
        console.log("  2. Use tokens for testing bridge orders");
        console.log("  3. Mint more if needed: cast send <token> 'mint(address,uint256)' <recipient> <amount>");
        console.log("=================================================");
    }
}
