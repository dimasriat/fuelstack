import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ArrowLeftRight, Droplet, History } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Bridge', icon: ArrowLeftRight },
    { path: '/faucet', label: 'Faucet', icon: Droplet },
    { path: '/explorer', label: 'Explorer', icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                FuelStack
              </h1>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map(({ path, label, icon: Icon }) => {
                  const isActive = location.pathname === path;
                  return (
                    <Link
                      key={path}
                      to={path}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-primary-500/10 text-primary-500 ring-1 ring-primary-500/30'
                          : 'text-zinc-500 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="glass border-t border-white/10 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-zinc-500">
          FuelStack Bridge • EVM ↔ Stacks
        </div>
      </footer>
    </div>
  );
};
