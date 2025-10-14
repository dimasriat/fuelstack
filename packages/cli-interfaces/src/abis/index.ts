// OpenGate ABI - only functions we need
export const OPENGATE_ABI = [
  {
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountOut', type: 'uint256' },
      { name: 'recipient', type: 'address' },
      { name: 'fillDeadline', type: 'uint256' },
      { name: 'sourceChainId', type: 'uint256' }
    ],
    name: 'open',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'solverRecipient', type: 'address' }
    ],
    name: 'settle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'orders',
    outputs: [
      { name: 'sender', type: 'address' },
      { name: 'tokenIn', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountOut', type: 'uint256' },
      { name: 'recipient', type: 'address' },
      { name: 'fillDeadline', type: 'uint256' },
      { name: 'sourceChainId', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'orderStatus',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function'
  },
  // OrderOpened event
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'sender', type: 'address' },
      { indexed: true, name: 'tokenIn', type: 'address' },
      { indexed: false, name: 'amountIn', type: 'uint256' },
      { indexed: false, name: 'tokenOut', type: 'address' },
      { indexed: false, name: 'amountOut', type: 'uint256' },
      { indexed: false, name: 'recipient', type: 'address' },
      { indexed: false, name: 'fillDeadline', type: 'uint256' },
      { indexed: false, name: 'sourceChainId', type: 'uint256' }
    ],
    name: 'OrderOpened',
    type: 'event'
  }
] as const;

// FillGate ABI - only functions we need
export const FILLGATE_ABI = [
  {
    inputs: [
      { name: 'orderId', type: 'uint256' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountOut', type: 'uint256' },
      { name: 'recipient', type: 'address' },
      { name: 'solverOriginAddress', type: 'address' },
      { name: 'fillDeadline', type: 'uint256' },
      { name: 'sourceChainId', type: 'uint256' }
    ],
    name: 'fill',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: 'orderId', type: 'uint256' }],
    name: 'orderStatus',
    outputs: [{ name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

// ERC20 ABI - standard functions
export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;