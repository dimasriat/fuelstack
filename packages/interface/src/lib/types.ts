export interface Order {
  orderId: string;
  chainId: number;
  chainName: string;
  tokenIn: string;
  amountIn: string;
  tokenOut: 'STX' | 'sBTC';
  amountOut: string;
  recipient: string;
  txHash: string;
  status: 'OPENED' | 'FILLED';
  createdAt: number;
  filledAt?: number;
  fillTxId?: string;
}
