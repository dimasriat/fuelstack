// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {OpenGateV2} from "../src/OpenGateV2.sol";
import {MockERC20} from "../src/MockERC20.sol";

/**
 * @title DeployOpenGateV2
 * @notice Deployment script for OpenGateV2 on source chains (Arbitrum Sepolia, Base Sepolia, etc.)
 * @dev Deploys OpenGateV2 and test tokens for EVM → Stacks bridge (no ChainRegistry needed)
 */
contract DeployOpenGateV2 is Script {
    // Environment variables
    address public deployer;
    address public trustedOracle;

    // Deployed contracts
    OpenGateV2 public openGateV2;
    MockERC20 public usdc;

    function setUp() public {
        deployer = vm.addr(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        trustedOracle = vm.addr(vm.envUint("ORACLE_PRIVATE_KEY"));
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("=== OpenGateV2 Deployment (EVM -> Stacks Bridge) ===");
        console.log("Deployer:", deployer);
        console.log("Oracle:", trustedOracle);
        console.log("Chain ID:", block.chainid);
        console.log("Grace Period: 5 minutes");

        // 1. Deploy OpenGateV2
        console.log("\n1. Deploying OpenGateV2...");
        openGateV2 = new OpenGateV2(trustedOracle);
        console.log("OpenGateV2 deployed at:", address(openGateV2));

        // 2. Deploy Test Token (USDC)
        console.log("\n2. Deploying USDC...");
        usdc = new MockERC20("USD Coin", "USDC", 6);
        console.log("USDC deployed at:", address(usdc));

        // 3. Mint USDC for testing
        console.log("\n3. Minting USDC...");
        mintTestTokens();

        vm.stopBroadcast();

        // 4. Print deployment summary
        printDeploymentSummary();
    }

    function mintTestTokens() internal {
        // Mint USDC (6 decimals)
        usdc.mint(deployer, 1000000 * 10**6); // 1M USDC
        usdc.mint(trustedOracle, 100000 * 10**6); // 100K USDC

        console.log("Minted USDC:");
        console.log("  Deployer: 1,000,000 USDC");
        console.log("  Oracle: 100,000 USDC");
    }

    function printDeploymentSummary() internal view {
        console.log("\n=================================================");
        console.log("DEPLOYMENT COMPLETE - EVM -> Stacks Bridge");
        console.log("=================================================");
        console.log("Network:");
        console.log("  Chain ID:", block.chainid);
        console.log("  Grace Period: 5 minutes (300 seconds)");
        console.log("");
        console.log("Deployed Contracts:");
        console.log("  OpenGateV2:", address(openGateV2));
        console.log("  USDC:", address(usdc));
        console.log("");
        console.log("Roles:");
        console.log("  Deployer:", deployer);
        console.log("  Oracle:", trustedOracle);
        console.log("");
        console.log("Configuration:");
        console.log("  Source Chain: Isolated (this chain only)");
        console.log("  Destination: Stacks Testnet");
        console.log("  sourceChainId: Auto-set to block.chainid");
        console.log("");
        console.log("Next Steps:");
        console.log("  1. Update config files with contract addresses");
        console.log("  2. Deploy to other source chains (Base, Optimism)");
        console.log("  3. Ensure Stacks FillGate is deployed");
        console.log("  4. Test with: pnpm dev bridge:open-order");
        console.log("=================================================");
    }
}
