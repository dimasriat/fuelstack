// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {OpenGate} from "../src/OpenGate.sol";
import {ChainRegistry} from "../src/ChainRegistry.sol";
import {MockERC20} from "../src/MockERC20.sol";

/**
 * @title DeploySourceChain
 * @notice Deployment script for source chains (Arbitrum Sepolia, Base Sepolia)
 * @dev Deploys OpenGate, ChainRegistry, and test tokens
 */
contract DeploySourceChain is Script {
    // Environment variables
    address public deployer;
    address public trustedOracle;
    
    // Deployed contracts
    ChainRegistry public chainRegistry;
    OpenGate public openGate;
    MockERC20 public usdc;

    function setUp() public {
        deployer = vm.addr(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        trustedOracle = vm.addr(vm.envUint("ORACLE_PRIVATE_KEY"));
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("=== Source Chain Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Oracle:", trustedOracle);
        console.log("Chain ID:", block.chainid);
        
        // 1. Deploy ChainRegistry
        console.log("\n1. Deploying ChainRegistry...");
        chainRegistry = new ChainRegistry(deployer);
        console.log("ChainRegistry deployed at:", address(chainRegistry));

        // 2. Deploy OpenGate
        console.log("\n2. Deploying OpenGate...");
        openGate = new OpenGate(trustedOracle, address(chainRegistry));
        console.log("OpenGate deployed at:", address(openGate));

        // 3. Deploy Test Token
        console.log("\n3. Deploying USDC...");
        usdc = new MockERC20("USD Coin", "USDC", 6);
        console.log("USDC deployed at:", address(usdc));

        // 4. Configure ChainRegistry with supported chains
        console.log("\n4. Configuring supported chains...");
        setupSupportedChains();

        // 5. Mint USDC
        console.log("\n5. Minting USDC...");
        mintTestTokens();

        vm.stopBroadcast();

        // 6. Print deployment summary
        printDeploymentSummary();
    }

    function setupSupportedChains() internal {
        // Add Arbitrum Sepolia
        chainRegistry.addChain(421614, "Arbitrum Sepolia", 300); // 5 minutes grace period
        chainRegistry.activateChain(421614);
        console.log("Added Arbitrum Sepolia (421614)");

        // Add Base Sepolia  
        chainRegistry.addChain(84532, "Base Sepolia", 600); // 10 minutes grace period
        chainRegistry.activateChain(84532);
        console.log("Added Base Sepolia (84532)");

        // Add Ethereum Sepolia for testing
        chainRegistry.addChain(11155111, "Ethereum Sepolia", 900); // 15 minutes grace period
        chainRegistry.activateChain(11155111);
        console.log("Added Ethereum Sepolia (11155111)");
    }

    function mintTestTokens() internal {
        // Mint USDC (6 decimals)
        usdc.mint(deployer, 1000000 * 10**6); // 1M USDC
        usdc.mint(trustedOracle, 100000 * 10**6); // 100K USDC

        console.log("Minted USDC to deployer and oracle");
    }

    function printDeploymentSummary() internal view {
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Chain:", block.chainid);
        console.log("OpenGate:", address(openGate));
        console.log("ChainRegistry:", address(chainRegistry));
        console.log("USDC:", address(usdc));
    }
}