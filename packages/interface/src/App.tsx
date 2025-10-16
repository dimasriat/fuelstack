import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { arbitrumSepolia, baseSepolia } from 'wagmi/chains';
import './App.css';

function App() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({
    address: address,
  });

  const getChainName = (id: number) => {
    if (id === arbitrumSepolia.id) return 'Arbitrum Sepolia';
    if (id === baseSepolia.id) return 'Base Sepolia';
    return 'Unknown Network';
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🌉 FuelStack Bridge</h1>
        <ConnectButton />
      </header>

      <main className="main">
        {isConnected && address ? (
          <div className="wallet-info">
            <div className="info-card">
              <h2>Wallet Info</h2>
              <div className="info-row">
                <span className="label">Address:</span>
                <span className="value">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
              <div className="info-row">
                <span className="label">Network:</span>
                <span className="value">{getChainName(chainId)}</span>
              </div>
              <div className="info-row">
                <span className="label">ETH Balance:</span>
                <span className="value">
                  {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0.0000 ETH'}
                </span>
              </div>
            </div>

            <div className="bridge-container">
              <h2>Bridge Coming Soon</h2>
              <p>Cross-chain bridge interface will be available here</p>
            </div>
          </div>
        ) : (
          <div className="connect-prompt">
            <h2>Welcome to FuelStack Bridge</h2>
            <p>Connect your wallet to start bridging between Arbitrum Sepolia and Base Sepolia</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
