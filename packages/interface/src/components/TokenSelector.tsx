import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Token {
  symbol: string;
  name: string;
  address: string;
}

interface TokenSelectorProps {
  tokens: Token[];
  selected: Token;
  onSelect: (token: Token) => void;
}

export const TokenSelector = ({ tokens, selected, onSelect }: TokenSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-hover"
      >
        <span className="font-medium">{selected.symbol}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 left-0 w-48 glass rounded-xl overflow-hidden z-20 shadow-glow">
            {tokens.map((token) => (
              <button
                key={token.address}
                onClick={() => {
                  onSelect(token);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
              >
                <div className="font-medium">{token.symbol}</div>
                <div className="text-sm text-zinc-500">{token.name}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
