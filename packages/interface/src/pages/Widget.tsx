import { useState } from 'react';
import { Card } from '../components/Card';
import { Copy, Check, Code2, Sparkles } from 'lucide-react';

export const Widget = () => {
  const [activeTab, setActiveTab] = useState<'react' | 'vanilla' | 'modal'>('react');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showModalPreview, setShowModalPreview] = useState(false);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const npmInstallCode = 'npm install @fuelstack/widget';
  const yarnInstallCode = 'yarn add @fuelstack/widget';

  const ReactCodeHighlighted = () => (
    <>
      <span className="text-purple-400">import</span> <span className="text-white">{'{'}</span> <span className="text-blue-300">FuelStackWidget</span> <span className="text-white">{'}'}</span> <span className="text-purple-400">from</span> <span className="text-green-300">'@fuelstack/widget'</span><span className="text-white">;</span>
      {'\n'}
      <span className="text-purple-400">import</span> <span className="text-green-300">'@fuelstack/widget/styles.css'</span><span className="text-white">;</span>
      {'\n\n'}
      <span className="text-purple-400">function</span> <span className="text-yellow-300">App</span><span className="text-white">() {'{'}</span>
      {'\n  '}
      <span className="text-purple-400">return</span> <span className="text-white">(</span>
      {'\n    '}
      <span className="text-gray-400">&lt;</span><span className="text-blue-300">FuelStackWidget</span>
      {'\n      '}
      <span className="text-blue-300">chains</span><span className="text-white">=</span><span className="text-white">{'{'}</span><span className="text-white">[</span><span className="text-green-300">'arbitrum'</span><span className="text-white">,</span> <span className="text-green-300">'base'</span><span className="text-white">,</span> <span className="text-green-300">'optimism'</span><span className="text-white">]</span><span className="text-white">{'}'}</span>
      {'\n      '}
      <span className="text-blue-300">defaultToken</span><span className="text-white">=</span><span className="text-green-300">"USDC"</span>
      {'\n      '}
      <span className="text-blue-300">theme</span><span className="text-white">=</span><span className="text-green-300">"dark"</span>
      {'\n      '}
      <span className="text-blue-300">onSuccess</span><span className="text-white">=</span><span className="text-white">{'{'}</span><span className="text-white">(</span><span className="text-orange-300">order</span><span className="text-white">) </span><span className="text-purple-400">=&gt;</span> <span className="text-white">{'{'}</span>
      {'\n        '}
      <span className="text-white">console.</span><span className="text-yellow-300">log</span><span className="text-white">(</span><span className="text-green-300">'Bridge order created:'</span><span className="text-white">,</span> <span className="text-orange-300">order</span><span className="text-white">);</span>
      {'\n      '}
      <span className="text-white">{'}'}</span><span className="text-white">{'}'}</span>
      {'\n    '}
      <span className="text-gray-400">/&gt;</span>
      {'\n  '}
      <span className="text-white">);</span>
      {'\n'}
      <span className="text-white">{'}'}</span>
    </>
  );

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

  const VanillaCodeHighlighted = () => (
    <>
      <span className="text-gray-500">&lt;!-- Add script tag --&gt;</span>
      {'\n'}
      <span className="text-gray-400">&lt;</span><span className="text-blue-300">script</span> <span className="text-blue-300">src</span><span className="text-white">=</span><span className="text-green-300">"https://unpkg.com/@fuelstack/widget@latest/dist/widget.js"</span><span className="text-gray-400">&gt;&lt;/</span><span className="text-blue-300">script</span><span className="text-gray-400">&gt;</span>
      {'\n'}
      <span className="text-gray-400">&lt;</span><span className="text-blue-300">link</span> <span className="text-blue-300">rel</span><span className="text-white">=</span><span className="text-green-300">"stylesheet"</span> <span className="text-blue-300">href</span><span className="text-white">=</span><span className="text-green-300">"https://unpkg.com/@fuelstack/widget@latest/dist/styles.css"</span><span className="text-gray-400">&gt;</span>
      {'\n\n'}
      <span className="text-gray-500">&lt;!-- Add widget container --&gt;</span>
      {'\n'}
      <span className="text-gray-400">&lt;</span><span className="text-blue-300">div</span> <span className="text-blue-300">id</span><span className="text-white">=</span><span className="text-green-300">"fuelstack-widget"</span><span className="text-gray-400">&gt;&lt;/</span><span className="text-blue-300">div</span><span className="text-gray-400">&gt;</span>
      {'\n\n'}
      <span className="text-gray-400">&lt;</span><span className="text-blue-300">script</span><span className="text-gray-400">&gt;</span>
      {'\n  '}
      <span className="text-gray-500">// Initialize widget</span>
      {'\n  '}
      <span className="text-white">FuelStack.</span><span className="text-yellow-300">init</span><span className="text-white">(</span><span className="text-white">{'{'}</span>
      {'\n    '}
      <span className="text-blue-300">container</span><span className="text-white">:</span> <span className="text-green-300">'#fuelstack-widget'</span><span className="text-white">,</span>
      {'\n    '}
      <span className="text-blue-300">chains</span><span className="text-white">:</span> <span className="text-white">[</span><span className="text-green-300">'arbitrum'</span><span className="text-white">,</span> <span className="text-green-300">'base'</span><span className="text-white">,</span> <span className="text-green-300">'optimism'</span><span className="text-white">]</span><span className="text-white">,</span>
      {'\n    '}
      <span className="text-blue-300">defaultToken</span><span className="text-white">:</span> <span className="text-green-300">'USDC'</span><span className="text-white">,</span>
      {'\n    '}
      <span className="text-blue-300">theme</span><span className="text-white">:</span> <span className="text-green-300">'dark'</span><span className="text-white">,</span>
      {'\n    '}
      <span className="text-blue-300">onSuccess</span><span className="text-white">:</span> <span className="text-white">(</span><span className="text-orange-300">order</span><span className="text-white">) </span><span className="text-purple-400">=&gt;</span> <span className="text-white">{'{'}</span>
      {'\n      '}
      <span className="text-white">console.</span><span className="text-yellow-300">log</span><span className="text-white">(</span><span className="text-green-300">'Bridge order created:'</span><span className="text-white">,</span> <span className="text-orange-300">order</span><span className="text-white">);</span>
      {'\n    '}
      <span className="text-white">{'}'}</span>
      {'\n  '}
      <span className="text-white">{'}'}</span><span className="text-white">);</span>
      {'\n'}
      <span className="text-gray-400">&lt;/</span><span className="text-blue-300">script</span><span className="text-gray-400">&gt;</span>
    </>
  );

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


  const ModalCodeHighlighted = () => (
    <>
      <span className="text-purple-400">import</span> <span className="text-white">{'{'}</span> <span className="text-blue-300">FuelStackButton</span> <span className="text-white">{'}'}</span> <span className="text-purple-400">from</span> <span className="text-green-300">'@fuelstack/widget'</span><span className="text-white">;</span>
      {'\n'}
      <span className="text-purple-400">import</span> <span className="text-green-300">'@fuelstack/widget/styles.css'</span><span className="text-white">;</span>
      {'\n\n'}
      <span className="text-purple-400">function</span> <span className="text-yellow-300">App</span><span className="text-white">() {'{'}</span>
      {'\n  '}
      <span className="text-purple-400">return</span> <span className="text-white">(</span>
      {'\n    '}
      <span className="text-gray-400">&lt;</span><span className="text-blue-300">FuelStackButton</span>
      {'\n      '}
      <span className="text-blue-300">variant</span><span className="text-white">=</span><span className="text-green-300">"primary"</span>
      {'\n      '}
      <span className="text-blue-300">chains</span><span className="text-white">=</span><span className="text-white">{'{'}</span><span className="text-white">[</span><span className="text-green-300">'arbitrum'</span><span className="text-white">,</span> <span className="text-green-300">'base'</span><span className="text-white">,</span> <span className="text-green-300">'optimism'</span><span className="text-white">]</span><span className="text-white">{'}'}</span>
      {'\n      '}
      <span className="text-blue-300">theme</span><span className="text-white">=</span><span className="text-green-300">"dark"</span>
      {'\n      '}
      <span className="text-blue-300">onSuccess</span><span className="text-white">=</span><span className="text-white">{'{'}</span><span className="text-white">(</span><span className="text-orange-300">order</span><span className="text-white">) </span><span className="text-purple-400">=&gt;</span> <span className="text-white">{'{'}</span>
      {'\n        '}
      <span className="text-white">console.</span><span className="text-yellow-300">log</span><span className="text-white">(</span><span className="text-green-300">'Order created:'</span><span className="text-white">,</span> <span className="text-orange-300">order</span><span className="text-white">);</span>
      {'\n      '}
      <span className="text-white">{'}'}</span><span className="text-white">{'}'}</span>
      {'\n    '}
      <span className="text-gray-400">&gt;</span>
      {'\n      '}
      <span className="text-white">Bridge Assets</span>
      {'\n    '}
      <span className="text-gray-400">&lt;/</span><span className="text-blue-300">FuelStackButton</span><span className="text-gray-400">&gt;</span>
      {'\n  '}
      <span className="text-white">);</span>
      {'\n'}
      <span className="text-white">{'}'}</span>
    </>
  );

  const modalCode = `import { FuelStackButton } from '@fuelstack/widget';
import '@fuelstack/widget/styles.css';

function App() {
  return (
    <FuelStackButton
      variant="primary"
      chains={['arbitrum', 'base', 'optimism']}
      theme="dark"
      onSuccess={(order) => {
        console.log('Order created:', order);
      }}
    >
      Bridge Assets
    </FuelStackButton>
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
        <h2 className="text-2xl font-bold mb-4 text-white">Integration Types</h2>
        <p className="text-zinc-400 mb-6">
          Choose between embedded widget or modal-based integration
        </p>

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
            Embedded (React)
          </button>
          <button
            onClick={() => setActiveTab('vanilla')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'vanilla'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Embedded (Vanilla)
          </button>
          <button
            onClick={() => setActiveTab('modal')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'modal'
                ? 'text-primary-500 border-b-2 border-primary-500'
                : 'text-zinc-500 hover:text-white'
            }`}
          >
            Modal
          </button>
        </div>

        {/* Code + Preview Split View */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Code Examples */}
          <div>
            <div className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wide">Code</div>
            {activeTab === 'react' ? (
              <div className="relative">
                <pre className="glass rounded-xl p-6 overflow-x-auto h-full">
                  <code className="text-sm whitespace-pre font-mono"><ReactCodeHighlighted /></code>
                </pre>
                <CopyButton code={reactCode} section="react" />
              </div>
            ) : activeTab === 'vanilla' ? (
              <div className="relative">
                <pre className="glass rounded-xl p-6 overflow-x-auto h-full">
                  <code className="text-sm whitespace-pre font-mono"><VanillaCodeHighlighted /></code>
                </pre>
                <CopyButton code={vanillaCode} section="vanilla" />
              </div>
            ) : (
              <div className="relative">
                <pre className="glass rounded-xl p-6 overflow-x-auto h-full">
                  <code className="text-sm whitespace-pre font-mono"><ModalCodeHighlighted /></code>
                </pre>
                <CopyButton code={modalCode} section="modal" />
              </div>
            )}
          </div>

          {/* Live Preview */}
          <div>
            <div className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wide">Preview</div>
            {activeTab === 'modal' ? (
              <div className="glass rounded-xl p-6">
                <div className="space-y-4">
                  <div className="text-center pb-4 border-b border-white/10">
                    <div className="text-xl font-bold text-white mb-1">Modal Widget</div>
                    <div className="text-sm text-zinc-500">Click button to open bridge modal</div>
                  </div>

                  {/* Modal Trigger Button */}
                  <div className="flex justify-center py-8">
                    <button
                      onClick={() => setShowModalPreview(true)}
                      className="px-8 py-4 bg-gradient-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity shadow-lg"
                    >
                      Bridge Assets
                    </button>
                  </div>

                  <div className="text-center text-xs text-zinc-600">
                    Click the button to see modal preview
                  </div>
                </div>

                {/* Modal Overlay */}
                {showModalPreview && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
                    <div className="relative max-w-md w-full">
                      {/* Close Button */}
                      <button
                        onClick={() => setShowModalPreview(false)}
                        className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors z-10"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>

                      {/* Modal Content */}
                      <div className="glass-solid rounded-2xl p-6 shadow-2xl">
                        <div className="space-y-4">
                          {/* Mini Widget Preview */}
                          <div className="text-center pb-4 border-b border-white/10">
                            <div className="text-xl font-bold text-white mb-1">Bridge to Stacks</div>
                            <div className="text-sm text-zinc-500">Modal widget</div>
                          </div>

                          {/* Chain Selector Preview */}
                          <div>
                            <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">
                              From
                            </label>
                            <div className="glass rounded-lg p-3 flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                              <span className="text-sm font-medium text-white">Arbitrum Sepolia</span>
                            </div>
                          </div>

                          {/* Token Input Preview */}
                          <div>
                            <div className="glass rounded-lg p-4 space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                                  <span className="text-sm font-medium text-white">USDC</span>
                                  <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                                <input
                                  type="text"
                                  value="100"
                                  readOnly
                                  className="flex-1 bg-transparent text-xl font-semibold text-white outline-none"
                                />
                              </div>
                              <div className="text-xs text-zinc-500 pt-2 border-t border-white/5">
                                Balance: 1,000 USDC
                              </div>
                            </div>
                          </div>

                          {/* Arrow */}
                          <div className="flex justify-center -my-2">
                            <div className="w-8 h-8 rounded-full glass flex items-center justify-center">
                              <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                              </svg>
                            </div>
                          </div>

                          {/* Output Preview */}
                          <div className="glass rounded-lg p-3 flex items-baseline justify-between">
                            <span className="text-xs text-zinc-500">You will receive</span>
                            <div className="text-right">
                              <div className="text-lg font-bold text-primary-500">230.41 STX</div>
                              <div className="text-xs text-zinc-600">≈ $100</div>
                            </div>
                          </div>

                          {/* Stacks Address Preview */}
                          <div>
                            <input
                              type="text"
                              placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                              className="w-full glass rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-primary-500/30"
                              readOnly
                            />
                          </div>

                          {/* Bridge Button Preview */}
                          <button className="w-full bg-gradient-primary text-white font-medium py-3 rounded-lg hover:opacity-90 transition-opacity">
                            Bridge Tokens
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass rounded-xl p-6">
                <div className="space-y-4">
                {/* Mini Widget Preview */}
                <div className="text-center pb-4 border-b border-white/10">
                  <div className="text-xl font-bold text-white mb-1">Bridge to Stacks</div>
                  <div className="text-sm text-zinc-500">Embedded widget preview</div>
                </div>

                {/* Chain Selector Preview */}
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">
                    From
                  </label>
                  <div className="glass rounded-lg p-3 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                    <span className="text-sm font-medium text-white">Arbitrum Sepolia</span>
                  </div>
                </div>

                {/* Token Input Preview */}
                <div>
                  <div className="glass rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
                        <span className="text-sm font-medium text-white">USDC</span>
                        <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value="100"
                        readOnly
                        className="flex-1 bg-transparent text-xl font-semibold text-white outline-none"
                      />
                    </div>
                    <div className="text-xs text-zinc-500 pt-2 border-t border-white/5">
                      Balance: 1,000 USDC
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center -my-2">
                  <div className="w-8 h-8 rounded-full glass flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </div>

                {/* Output Preview */}
                <div className="glass rounded-lg p-3 flex items-baseline justify-between">
                  <span className="text-xs text-zinc-500">You will receive</span>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary-500">230.41 STX</div>
                    <div className="text-xs text-zinc-600">≈ $100</div>
                  </div>
                </div>

                {/* Stacks Address Preview */}
                <div>
                  <input
                    type="text"
                    placeholder="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
                    className="w-full glass rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-primary-500/30"
                    readOnly
                  />
                </div>

                {/* Bridge Button Preview */}
                <button className="w-full bg-gradient-primary text-white font-medium py-3 rounded-lg hover:opacity-90 transition-opacity">
                  Bridge Tokens
                </button>

                {/* Note */}
                <div className="pt-2 text-center text-xs text-zinc-600">
                  This is a preview - connect wallet to test
                </div>
              </div>
            </div>
            )}
          </div>
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
