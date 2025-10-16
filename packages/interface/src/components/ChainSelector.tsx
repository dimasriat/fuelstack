import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface Chain {
  id: number;
  name: string;
  shortName: string;
}

interface ChainSelectorProps {
  chains: Chain[];
  selected: Chain;
  onSelect: (chain: Chain) => void;
}

export const ChainSelector = ({ chains, selected, onSelect }: ChainSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl glass glass-hover"
      >
        <span className="font-medium text-white">{selected.name}</span>
        <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 left-0 right-0 glass-solid rounded-xl overflow-hidden z-20 shadow-glow">
            {chains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => {
                  onSelect(chain);
                  setIsOpen(false);
                }}
                className={`w-full px-5 py-3 text-left transition-colors border-b border-white/10 last:border-0 ${
                  selected.id === chain.id
                    ? 'bg-primary-500/20 text-primary-500'
                    : 'text-white hover:bg-zinc-800'
                }`}
              >
                <div className="font-medium">{chain.name}</div>
                <div className="text-sm text-zinc-400">{chain.shortName}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
