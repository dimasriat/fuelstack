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
        addChainIfNotExists(421614, "Arbitrum Sepolia", 300);

        // Add Base Sepolia as source
        addChainIfNotExists(84532, "Base Sepolia", 600);

        // Add Ethereum Sepolia for testing
        addChainIfNotExists(11155111, "Ethereum Sepolia", 900);
    }

    function addChainIfNotExists(uint256 chainId, string memory name, uint256 gracePeriod) internal {
        // Check if chain already exists
        (bool isSupported,,,) = fillGate.chainConfigs(chainId);
        
        if (!isSupported) {
            fillGate.addChain(chainId, name, gracePeriod);
            console.log("Added source chain:", name);
            console.log("Chain ID:", chainId);
        } else {
            console.log("Source chain already exists:", name);
            console.log("Chain ID:", chainId);
        }
        
        // Ensure chain is activated
        (,, , bool isActive) = fillGate.chainConfigs(chainId);
        if (!isActive) {
            fillGate.activateChain(chainId);
            console.log("Activated source chain:", name);
        }
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