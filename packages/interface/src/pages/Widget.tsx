import { useState } from 'react';
import { Card } from '../components/Card';
import { Copy, Check, Code2, Sparkles } from 'lucide-react';

export const Widget = () => {
  const [activeTab, setActiveTab] = useState<'react' | 'vanilla'>('react');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const npmInstallCode = 'npm install @fuelstack/widget';
  const yarnInstallCode = 'yarn add @fuelstack/widget';

  const reactCode = `import { FuelStackWidget } from '@fuelstack/widget';
import '@fuelstack/widget/styles.css';

function App() {
  return (
    <FuelStackWidget
      chains={['arbitrum', 'base', 'optimism']}
      defaultToken="USDC"
      theme="dark"
      onSuccess={(order) => {
        console.log('Bridge order created:', order);
      }}
    />
  );
}`;

  const vanillaCode = `<!-- Add script tag -->
<script src="https://unpkg.com/@fuelstack/widget@latest/dist/widget.js"></script>
<link rel="stylesheet" href="https://unpkg.com/@fuelstack/widget@latest/dist/styles.css">

<!-- Add widget container -->
<div id="fuelstack-widget"></div>

<script>
  // Initialize widget
  FuelStack.init({
    container: '#fuelstack-widget',
    chains: ['arbitrum', 'base', 'optimism'],
    defaultToken: 'USDC',
    theme: 'dark',
    onSuccess: (order) => {
      console.log('Bridge order created:', order);
    }
  });
</script>`;

  const nextjsCode = `'use client';

import dynamic from 'next/dynamic';

const FuelStackWidget = dynamic(
  () => import('@fuelstack/widget').then((mod) => mod.FuelStackWidget),
  { ssr: false }
);

export default function BridgePage() {
  return (
    <div className="container">
      <FuelStackWidget
        chains={['arbitrum', 'base', 'optimism']}
        theme="dark"
      />
    </div>
  );
}`;

  const CopyButton = ({ code, section }: { code: string; section: string }) => (
    <button
      onClick={() => copyToClipboard(code, section)}
      className="absolute top-3 right-3 p-2 rounded-lg glass glass-hover transition-all"
      title="Copy code"
    >
      {copiedSection === section ? (
        <Check className="w-4 h-4 text-green-400" />
      ) : (
        <Copy className="w-4 h-4 text-zinc-400" />
      )}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
          <Sparkles className="w-4 h-4 text-primary-500" />
          <span className="text-sm font-medium text-primary-500">Integration Guide</span>
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
          FuelStack Widget
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Embed cross-chain bridging directly into your Stacks dApp. Let users acquire STX and sBTC from EVM chains without leaving your application.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-4 mb-12">
        <Card className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center mx-auto mb-3">
            <Code2 className="w-6 h-6 text-primary-500" />
          </div>
          <h3 className="font-semibold mb-2 text-white">Easy Integration</h3>
          <p className="text-sm text-zinc-400">Drop-in component for React or vanilla JS</p>
        </Card>
        <Card className="text-center">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-green-500" />
          </div>
          <h3 className="font-semibold mb-2 text-white">Multi-Chain Support</h3>
          <p className="text-sm text-zinc-400">Arbitrum, Base, and Optimism Sepolia</p>
        </Card>
        <Card className="text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="font-semibold mb-2 text-white">Fully Customizable</h3>
          <p className="text-sm text-zinc-400">Theme, tokens, chains, and callbacks</p>
        </Card>
      </div>

      {/* Installation */}
      <Card className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-white">Installation</h2>
        <p className="text-zinc-400 mb-6">
          Install the FuelStack widget package using your preferred package manager:
        </p>

        <div className="space-y-4">
          <div className="relative">
            <div className="glass rounded-xl p-4 font-mono text-sm">
              <span className="text-zinc-500">$</span> <span className="text-white">{npmInstallCode}</span>
            </div>
            <CopyButton code={npmInstallCode} section="npm" />
          </div>

          <div className="relative">
            <div className="glass rounded-xl p-4 font-mono text-sm">
              <span className="text-zinc-500">$</span> <span className="text-white">{yarnInstallCode}</span>
            </div>
            <CopyButton code={yarnInstallCode} section="yarn" />
          </div>
        </div>
      </Card>

      {/* Integration Examples */}
      <Card className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-white">Quick Start</h2>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10">
          <button
            onClick={() => setActiveTab('react')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'react'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            React
          </button>
          <button
            onClick={() => setActiveTab('vanilla')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'vanilla'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Vanilla JS
          </button>
        </div>

        {/* Code Examples */}
        {activeTab === 'react' ? (
          <div className="relative">
            <pre className="glass rounded-xl p-6 overflow-x-auto">
              <code className="text-sm text-zinc-300 whitespace-pre">{reactCode}</code>
            </pre>
            <CopyButton code={reactCode} section="react" />
          </div>
        ) : (
          <div className="relative">
            <pre className="glass rounded-xl p-6 overflow-x-auto">
              <code className="text-sm text-zinc-300 whitespace-pre">{vanillaCode}</code>
            </pre>
            <CopyButton code={vanillaCode} section="vanilla" />
          </div>
        )}
      </Card>

      {/* Next.js Integration */}
      <Card className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-white">Next.js App Router</h2>
        <p className="text-zinc-400 mb-6">
          For Next.js 13+ with App Router, use dynamic imports to avoid SSR issues:
        </p>

        <div className="relative">
          <pre className="glass rounded-xl p-6 overflow-x-auto">
            <code className="text-sm text-zinc-300 whitespace-pre">{nextjsCode}</code>
          </pre>
          <CopyButton code={nextjsCode} section="nextjs" />
        </div>
      </Card>

      {/* Configuration */}
      <Card className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-white">Configuration</h2>
        <p className="text-zinc-400 mb-6">
          Customize the widget behavior with these props:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Prop</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Default</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-sm text-primary-500">chains</td>
                <td className="py-3 px-4 text-sm text-zinc-400">string[]</td>
                <td className="py-3 px-4 text-sm text-zinc-500">all</td>
                <td className="py-3 px-4 text-sm text-zinc-300">Supported EVM chains to show</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-sm text-primary-500">defaultToken</td>
                <td className="py-3 px-4 text-sm text-zinc-400">string</td>
                <td className="py-3 px-4 text-sm text-zinc-500">'USDC'</td>
                <td className="py-3 px-4 text-sm text-zinc-300">Default token selection</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-sm text-primary-500">defaultOutput</td>
                <td className="py-3 px-4 text-sm text-zinc-400">string</td>
                <td className="py-3 px-4 text-sm text-zinc-500">'stx'</td>
                <td className="py-3 px-4 text-sm text-zinc-300">Output type: 'stx' or 'sbtc'</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-sm text-primary-500">theme</td>
                <td className="py-3 px-4 text-sm text-zinc-400">string</td>
                <td className="py-3 px-4 text-sm text-zinc-500">'dark'</td>
                <td className="py-3 px-4 text-sm text-zinc-300">Theme: 'dark' or 'light'</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-sm text-primary-500">recipient</td>
                <td className="py-3 px-4 text-sm text-zinc-400">string</td>
                <td className="py-3 px-4 text-sm text-zinc-500">-</td>
                <td className="py-3 px-4 text-sm text-zinc-300">Pre-fill Stacks address</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-sm text-primary-500">onSuccess</td>
                <td className="py-3 px-4 text-sm text-zinc-400">function</td>
                <td className="py-3 px-4 text-sm text-zinc-500">-</td>
                <td className="py-3 px-4 text-sm text-zinc-300">Callback when order is created</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-4 font-mono text-sm text-primary-500">onError</td>
                <td className="py-3 px-4 text-sm text-zinc-400">function</td>
                <td className="py-3 px-4 text-sm text-zinc-500">-</td>
                <td className="py-3 px-4 text-sm text-zinc-300">Callback on error</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono text-sm text-primary-500">compact</td>
                <td className="py-3 px-4 text-sm text-zinc-400">boolean</td>
                <td className="py-3 px-4 text-sm text-zinc-500">false</td>
                <td className="py-3 px-4 text-sm text-zinc-300">Show compact widget version</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Use Cases */}
      <Card className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-white">Use Cases</h2>
        <div className="space-y-4">
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-white mb-2">DeFi Applications</h3>
            <p className="text-sm text-zinc-400">
              Let users bridge USDC/WBTC from EVM chains to get STX for staking or sBTC for DeFi protocols directly in your dApp.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-white mb-2">NFT Marketplaces</h3>
            <p className="text-sm text-zinc-400">
              Enable users to acquire STX for purchasing NFTs without leaving your marketplace.
            </p>
          </div>
          <div className="glass rounded-xl p-5">
            <h3 className="font-semibold text-white mb-2">Gaming Platforms</h3>
            <p className="text-sm text-zinc-400">
              Allow gamers to bridge assets from EVM chains to participate in Stacks-based games.
            </p>
          </div>
        </div>
      </Card>

      {/* Support */}
      <Card>
        <h2 className="text-2xl font-bold mb-4 text-white">Need Help?</h2>
        <p className="text-zinc-400 mb-6">
          Check out our resources or reach out to the community:
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com/fuelstack/widget"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg glass glass-hover text-sm font-medium transition-all"
          >
            GitHub
          </a>
          <a
            href="https://docs.fuelstack.io"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg glass glass-hover text-sm font-medium transition-all"
          >
            Documentation
          </a>
          <a
            href="https://discord.gg/fuelstack"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg glass glass-hover text-sm font-medium transition-all"
          >
            Discord
          </a>
        </div>
      </Card>
    </div>
  );
};
