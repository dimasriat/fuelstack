import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 8, // 8px gap (mt-2)
        left: rect.left + window.scrollX,
        width: 192, // w-48 = 12rem = 192px
      });
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-hover"
      >
        <span className="font-medium">{selected.symbol}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed glass-solid rounded-xl overflow-hidden z-50 shadow-glow"
            style={{
              top: `${position.top}px`,
              left: `${position.left}px`,
              width: `${position.width}px`,
            }}
          >
            {tokens.map((token) => (
              <button
                key={token.address}
                onClick={() => {
                  onSelect(token);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-zinc-800 transition-colors border-b border-white/10 last:border-0"
              >
                <div className="font-medium text-white">{token.symbol}</div>
                <div className="text-sm text-zinc-400">{token.name}</div>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};
