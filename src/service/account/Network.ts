import { isProduction } from '@utils/is';

export const Network = {
  chainId: isProduction ? '1030' : '71',
  chainName: isProduction ? 'Conflux eSpace' : 'Conflux eSpace (Testnet)',
  rpcUrls: [isProduction ? 'https://evm.confluxrpc.com' : 'https://evmtestnet.confluxrpc.com'],
  blockExplorerUrls: [isProduction ? 'https://evm.confluxscan.net' : 'https://evmtestnet.confluxscan.net'],
  nativeCurrency: {
    name: 'Conflux',
    symbol: 'CFX',
    decimals: 18,
  },
};
export const targetChainId = Network.chainId;