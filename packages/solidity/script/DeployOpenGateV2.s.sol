// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {OpenGateV2} from "../src/OpenGateV2.sol";

/**
 * @title DeployOpenGateV2
 * @notice Deployment script for OpenGateV2 on source chains (Arbitrum Sepolia, Base Sepolia, etc.)
 * @dev Deploys only OpenGateV2 core contract (deploy mock tokens separately with DeployMockTokens.s.sol)
 */
contract DeployOpenGateV2 is Script {
    // Environment variables
    address public deployer;
    address public trustedOracle;

    // Deployed contracts
    OpenGateV2 public openGateV2;

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
        console.log("Grace Period: 5 minutes (constant)");

        // Deploy OpenGateV2
        console.log("\nDeploying OpenGateV2...");
        openGateV2 = new OpenGateV2(trustedOracle);
        console.log("OpenGateV2 deployed at:", address(openGateV2));

        vm.stopBroadcast();

        // Print deployment summary
        printDeploymentSummary();
    }

    function printDeploymentSummary() internal view {
        console.log("\n=================================================");
        console.log("OPENGATEV2 DEPLOYMENT COMPLETE");
        console.log("=================================================");
        console.log("Network:");
        console.log("  Chain ID:", block.chainid);
        console.log("  Grace Period: 5 minutes (300 seconds)");
        console.log("");
        console.log("Deployed Contract:");
        console.log("  OpenGateV2:", address(openGateV2));
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
        console.log("  1. Deploy mock tokens: forge script script/DeployMockTokens.s.sol:DeployMockTokens --broadcast");
        console.log("  2. Update config files with contract addresses");
        console.log("  3. Deploy to other source chains (Base, Optimism)");
        console.log("  4. Ensure Stacks FillGate is deployed");
        console.log("  5. Test with: pnpm dev bridge:open-order");
        console.log("=================================================");
    }
}
