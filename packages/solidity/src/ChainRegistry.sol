// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title ChainRegistry
/// @notice Manages supported source chains for cross-chain intent bridge
contract ChainRegistry is AccessControl {
    bytes32 public constant CHAIN_MANAGER_ROLE = keccak256("CHAIN_MANAGER_ROLE");

    struct ChainConfig {
        bool isSupported;
        uint256 gracePeriod;
        string name;
        bool isActive;
    }

    mapping(uint256 => ChainConfig) public chainConfigs;
    uint256[] public supportedChainIds;

    event ChainAdded(uint256 indexed chainId, string name, uint256 gracePeriod);
    event ChainUpdated(uint256 indexed chainId, string name, uint256 gracePeriod);
    event ChainActivated(uint256 indexed chainId);
    event ChainDeactivated(uint256 indexed chainId);
    event ChainRemoved(uint256 indexed chainId);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(CHAIN_MANAGER_ROLE, admin);

        // Add current chain by default
        uint256 currentChainId = block.chainid;
        chainConfigs[currentChainId] =
            ChainConfig({isSupported: true, gracePeriod: 5 minutes, name: "Current Chain", isActive: true});
        supportedChainIds.push(currentChainId);

        emit ChainAdded(currentChainId, "Current Chain", 5 minutes);
    }

    /// @notice Add a new supported source chain
    /// @param chainId The chain ID to add
    /// @param name Human readable name for the chain
    /// @param gracePeriod Grace period for this chain in seconds
    function addChain(uint256 chainId, string calldata name, uint256 gracePeriod)
        external
        onlyRole(CHAIN_MANAGER_ROLE)
    {
        require(!chainConfigs[chainId].isSupported, "Chain already exists");
        require(chainId != 0, "Invalid chain ID");
        require(gracePeriod > 0, "Grace period must be positive");

        chainConfigs[chainId] = ChainConfig({isSupported: true, gracePeriod: gracePeriod, name: name, isActive: true});
        supportedChainIds.push(chainId);

        emit ChainAdded(chainId, name, gracePeriod);
    }

    /// @notice Update configuration for an existing chain
    /// @param chainId The chain ID to update
    /// @param name New name for the chain
    /// @param gracePeriod New grace period for this chain
    function updateChain(uint256 chainId, string calldata name, uint256 gracePeriod)
        external
        onlyRole(CHAIN_MANAGER_ROLE)
    {
        require(chainConfigs[chainId].isSupported, "Chain does not exist");
        require(gracePeriod > 0, "Grace period must be positive");

        chainConfigs[chainId].name = name;
        chainConfigs[chainId].gracePeriod = gracePeriod;

        emit ChainUpdated(chainId, name, gracePeriod);
    }

    /// @notice Activate a chain (allow new orders)
    /// @param chainId The chain ID to activate
    function activateChain(uint256 chainId) external onlyRole(CHAIN_MANAGER_ROLE) {
        require(chainConfigs[chainId].isSupported, "Chain does not exist");
        require(!chainConfigs[chainId].isActive, "Chain already active");

        chainConfigs[chainId].isActive = true;
        emit ChainActivated(chainId);
    }

    /// @notice Deactivate a chain (prevent new orders, existing orders still valid)
    /// @param chainId The chain ID to deactivate
    function deactivateChain(uint256 chainId) external onlyRole(CHAIN_MANAGER_ROLE) {
        require(chainConfigs[chainId].isSupported, "Chain does not exist");
        require(chainConfigs[chainId].isActive, "Chain already inactive");

        chainConfigs[chainId].isActive = false;
        emit ChainDeactivated(chainId);
    }

    /// @notice Remove a chain completely (emergency only)
    /// @param chainId The chain ID to remove
    function removeChain(uint256 chainId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(chainConfigs[chainId].isSupported, "Chain does not exist");
        require(chainId != block.chainid, "Cannot remove current chain");

        delete chainConfigs[chainId];

        // Remove from supportedChainIds array
        for (uint256 i = 0; i < supportedChainIds.length; i++) {
            if (supportedChainIds[i] == chainId) {
                supportedChainIds[i] = supportedChainIds[supportedChainIds.length - 1];
                supportedChainIds.pop();
                break;
            }
        }

        emit ChainRemoved(chainId);
    }

    /// @notice Check if a chain is supported and active
    /// @param chainId The chain ID to check
    /// @return isValid True if chain is supported and active
    function isChainValid(uint256 chainId) external view returns (bool isValid) {
        ChainConfig memory config = chainConfigs[chainId];
        return config.isSupported && config.isActive;
    }

    /// @notice Get grace period for a specific chain
    /// @param chainId The chain ID to check
    /// @return gracePeriod Grace period in seconds
    function getGracePeriod(uint256 chainId) external view returns (uint256 gracePeriod) {
        require(chainConfigs[chainId].isSupported, "Chain not supported");
        return chainConfigs[chainId].gracePeriod;
    }

    /// @notice Get chain configuration
    /// @param chainId The chain ID to check
    /// @return config Chain configuration struct
    function getChainConfig(uint256 chainId) external view returns (ChainConfig memory config) {
        return chainConfigs[chainId];
    }

    /// @notice Get all supported chain IDs
    /// @return chainIds Array of supported chain IDs
    function getSupportedChains() external view returns (uint256[] memory chainIds) {
        return supportedChainIds;
    }

    /// @notice Get count of supported chains
    /// @return count Number of supported chains
    function getSupportedChainCount() external view returns (uint256 count) {
        return supportedChainIds.length;
    }
}
