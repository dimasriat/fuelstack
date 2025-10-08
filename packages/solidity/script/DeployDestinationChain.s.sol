// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {FillGate} from "../src/FillGate.sol";
import {MockERC20} from "../src/MockERC20.sol";

/**
 * @title DeployDestinationChain
 * @notice Deployment script for destination chain (Arbitrum Sepolia)
 * @dev Deploys FillGate and test tokens for order fulfillment
 */
contract DeployDestinationChain is Script {
    // Environment variables
    address public deployer;
    address public admin;
    address public chainManager;
    
    // Deployed contracts
    FillGate public fillGate;
    MockERC20 public sbtc;

    function setUp() public {
        deployer = vm.addr(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        admin = vm.addr(vm.envUint("ORACLE_PRIVATE_KEY")); // Using oracle as admin
        chainManager = admin; // Admin can also manage chains
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        console.log("=== Destination Chain Deployment ===");
        console.log("Deployer:", deployer);
        console.log("Admin:", admin);
        console.log("Chain Manager:", chainManager);
        console.log("Chain ID:", block.chainid);
        
        // 1. Deploy FillGate
        console.log("\n1. Deploying FillGate...");
        fillGate = new FillGate(admin);
        console.log("FillGate deployed at:", address(fillGate));

        // 2. Deploy Test Token
        console.log("\n2. Deploying sBTC...");
        sbtc = new MockERC20("Stacks Bitcoin", "sBTC", 8);
        console.log("sBTC deployed at:", address(sbtc));

        // 3. Configure FillGate with supported source chains
        console.log("\n3. Configuring supported source chains...");
        setupSupportedChains();

        // 4. Setup roles
        console.log("\n4. Setting up roles...");
        setupRoles();

        // 5. Mint sBTC
        console.log("\n5. Minting sBTC...");
        mintTestTokens();

        vm.stopBroadcast();

        // 6. Print deployment summary
        printDeploymentSummary();
    }

    function setupSupportedChains() internal {
        // Add Arbitrum Sepolia as source
        fillGate.addChain(421614, "Arbitrum Sepolia", 300); // 5 minutes grace period
        fillGate.activateChain(421614);
        console.log("Added Arbitrum Sepolia (421614) as source");

        // Add Base Sepolia as source
        fillGate.addChain(84532, "Base Sepolia", 600); // 10 minutes grace period  
        fillGate.activateChain(84532);
        console.log("Added Base Sepolia (84532) as source");

        // Add Ethereum Sepolia for testing
        fillGate.addChain(11155111, "Ethereum Sepolia", 900); // 15 minutes grace period
        fillGate.activateChain(11155111);
        console.log("Added Ethereum Sepolia (11155111) as source");
    }

    function setupRoles() internal {
        // Grant CHAIN_MANAGER_ROLE to designated manager
        bytes32 chainManagerRole = fillGate.CHAIN_MANAGER_ROLE();
        fillGate.grantRole(chainManagerRole, chainManager);
        console.log("Granted CHAIN_MANAGER_ROLE to:", chainManager);

        // Admin role is automatically granted to constructor parameter
        console.log("DEFAULT_ADMIN_ROLE granted to:", admin);
    }

    function mintTestTokens() internal {
        // Mint sBTC (8 decimals) - for order fulfillment
        sbtc.mint(deployer, 100 * 10**8); // 100 sBTC
        sbtc.mint(admin, 10 * 10**8); // 10 sBTC
        sbtc.mint(address(fillGate), 50 * 10**8); // 50 sBTC for fills

        console.log("Minted sBTC to deployer, admin, and FillGate contract");
    }

    function printDeploymentSummary() internal view {
        console.log("\n=== DEPLOYMENT COMPLETE ===");
        console.log("Chain:", block.chainid);
        console.log("FillGate:", address(fillGate));
        console.log("sBTC:", address(sbtc));
    }
}