# OpenGateV2 Deployment Guide

## Overview

OpenGateV2 is the EVM → Stacks cross-chain intent bridge. This guide covers deploying the source chain contracts (OpenGateV2 + ChainRegistry + test tokens).

## Architecture

- **Source Chains**: Multiple EVM chains (Arbitrum, Base, Optimism, etc.)
- **Destination Chain**: Stacks blockchain (deployed via Clarity contracts separately)
- **Bridge Flow**: Users lock tokens on EVM → Solvers fill on Stacks → Oracle settles on EVM

## Prerequisites

1. **Foundry** installed
2. **Environment variables** set in `.env`:
   ```bash
   DEPLOYER_PRIVATE_KEY=0x...
   ORACLE_PRIVATE_KEY=0x...

   # RPC URLs for each source chain
   ARBITRUM_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
   BASE_SEPOLIA_RPC=https://sepolia.base.org
   OPTIMISM_SEPOLIA_RPC=https://sepolia.optimism.io

   # Block explorers (for verification)
   ARBISCAN_API_KEY=...
   BASESCAN_API_KEY=...
   OPTIMISTIC_ETHERSCAN_API_KEY=...
   ```

## Deployment Steps

### 1. Deploy to Arbitrum Sepolia (Primary Source Chain)

```bash
cd packages/solidity

forge script script/DeployOpenGateV2.s.sol:DeployOpenGateV2 \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --broadcast \
  --verify \
  -vvvv
```

**Deployed Contracts:**
- ✅ ChainRegistry
- ✅ OpenGateV2
- ✅ USDC (test token)

**Configured Chains:**
- Arbitrum Sepolia (421614) - 5 min grace period
- Base Sepolia (84532) - 10 min grace period
- Optimism Sepolia (11155420) - 10 min grace period
- Ethereum Sepolia (11155111) - 15 min grace period

### 2. Deploy to Additional Source Chains (Optional)

Deploy to Base Sepolia:
```bash
forge script script/DeployOpenGateV2.s.sol:DeployOpenGateV2 \
  --rpc-url $BASE_SEPOLIA_RPC \
  --broadcast \
  --verify \
  -vvvv
```

Deploy to Optimism Sepolia:
```bash
forge script script/DeployOpenGateV2.s.sol:DeployOpenGateV2 \
  --rpc-url $OPTIMISM_SEPOLIA_RPC \
  --broadcast \
  --verify \
  -vvvv
```

### 3. Update Configuration Files

After deployment, update the contract addresses in:

**packages/cli-interfaces/src/config.ts:**
```typescript
export const SOURCE_CONTRACTS = {
  openGate: '0x...', // OpenGateV2 address on Arbitrum Sepolia
  usdc: '0x...',     // USDC address on Arbitrum Sepolia
};
```

**packages/solver/src/config.ts:**
```typescript
export const SOURCE_CONTRACTS = {
  openGate: '0x...', // Same as above
};
```

**packages/keeper/src/config/chains.ts:**
```typescript
export const arbitrumSepolia: ChainConfig = {
  // ...
  openGate: '0x...', // OpenGateV2 address
};
```

### 4. Verify Deployment

Check that contracts are deployed:
```bash
# On Arbitrum Sepolia
cast call 0x<OpenGateV2-address> "orderCounter()" --rpc-url $ARBITRUM_SEPOLIA_RPC
# Should return: 0 (no orders yet)

cast call 0x<OpenGateV2-address> "trustedOracle()" --rpc-url $ARBITRUM_SEPOLIA_RPC
# Should return: <oracle-address>

cast call 0x<ChainRegistry-address> "isChainValid(uint256)(bool)" 421614 --rpc-url $ARBITRUM_SEPOLIA_RPC
# Should return: true
```

## Testing After Deployment

### Test Flow:

1. **Open an order** (EVM → Stacks):
   ```bash
   pnpm dev bridge:open-order \
     --amount-in 100 \
     --amount-out 0.003 \
     --token-out native \
     --recipient ST1E5EJ7WPTJA1PBP81FMZK4J43NBWC7E80F8W9P5
   ```

2. **Fill the order** (on Stacks):
   ```bash
   pnpm dev bridge:fill-stacks-order \
     --order-id 1 \
     --solver-evm-address 0x...
   ```

3. **Settle the order** (oracle on EVM):
   ```bash
   pnpm dev bridge:settle-order \
     --order-id 1 \
     --solver-address 0x...
   ```

## Advanced: Manual Deployment

If you need to deploy contracts individually:

```bash
# 1. Deploy ChainRegistry
forge create src/ChainRegistry.sol:ChainRegistry \
  --constructor-args <deployer-address> \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# 2. Deploy OpenGateV2
forge create src/OpenGateV2.sol:OpenGateV2 \
  --constructor-args <oracle-address> <chain-registry-address> \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY

# 3. Deploy USDC
forge create src/MockERC20.sol:MockERC20 \
  --constructor-args "USD Coin" "USDC" 6 \
  --rpc-url $ARBITRUM_SEPOLIA_RPC \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## Troubleshooting

**Issue**: "Invalid or inactive source chain" when opening order
- **Solution**: Check ChainRegistry has the source chain added and activated
  ```bash
  cast call <ChainRegistry-address> "isChainValid(uint256)(bool)" <chainId> --rpc-url $RPC_URL
  ```

**Issue**: "Insufficient USDC balance"
- **Solution**: Mint USDC to your address
  ```bash
  cast send <USDC-address> "mint(address,uint256)" <your-address> 1000000000 --rpc-url $RPC_URL --private-key $PRIVATE_KEY
  ```

**Issue**: Contract verification fails
- **Solution**: Add `--verify-api-key` flag with your block explorer API key

## Contract Addresses (Example - Update After Your Deployment)

### Arbitrum Sepolia
- OpenGateV2: `0x...`
- ChainRegistry: `0x...`
- USDC: `0x...`

### Base Sepolia
- OpenGateV2: `0x...`
- ChainRegistry: `0x...`
- USDC: `0x...`

### Stacks Testnet (Clarity Contracts)
- FillGate: `ST3P57DRBDE7ZRHEGEA3S64H0RFPSR8MV3PJGFSEX.fill-gate`

## Security Notes

- ⚠️ **Test tokens only**: MockERC20 USDC is for testing. Don't use in production.
- ⚠️ **Oracle security**: Protect the oracle private key. It can settle orders.
- ⚠️ **Chain registry**: Admin can add/remove chains. Keep admin key secure.
- ⚠️ **Grace periods**: Set appropriate grace periods based on chain finality times.

## Additional Resources

- Foundry Documentation: https://book.getfoundry.sh/
- Arbitrum Sepolia Faucet: https://faucet.quicknode.com/arbitrum/sepolia
- Base Sepolia Faucet: https://www.alchemy.com/faucets/base-sepolia
- Stacks Testnet Faucet: https://explorer.hiro.so/sandbox/faucet?chain=testnet
