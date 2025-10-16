import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia, baseSepolia, optimismSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'FuelStack Bridge',
  projectId: 'YOUR_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [arbitrumSepolia, baseSepolia, optimismSepolia],
  ssr: false,
});
