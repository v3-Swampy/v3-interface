import { atom, selector, useRecoilValue } from 'recoil';
import { setRecoil, getRecoil } from 'recoil-nexus';
import { persistAtom } from '@utils/recoilUtils';
import {
  accountState as fluentAccountState,
  chainIdState as fluentChainIdState,
  connect as connectFluent,
  disconnect as disconnectFluent,
  switchChain as switchChainFluent,
  addChain as addChainFluent,
  sendTransaction as sendTransactionWithFluent,
  watchAsset as watchAssetFluent,
} from './fluent';
import {
  accountState as metamaskAccountState,
  chainIdState as metamaskChainIdState,
  connect as connectMetamask,
  disconnect as disconnectMetamask,
  switchChain as switchChainMetamask,
  addChain as addChainMetamask,
  sendTransaction as sendTransactionWithMetamask,
  watchAsset as watchAssetMetamask,
} from './metamask';
import { isProduction } from '@utils/is';
import { showToast } from '@components/showPopup';

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

const methodsMap = {
  fluent: {
    accountState: fluentAccountState,
    chainIdState: fluentChainIdState,
    connect: connectFluent,
    switchChain: switchChainFluent,
    addChain: addChainFluent,
    sendTransaction: sendTransactionWithFluent,
    disconnect: disconnectFluent,
    watchAsset: watchAssetFluent,
  },
  metamask: {
    accountState: metamaskAccountState,
    chainIdState: metamaskChainIdState,
    connect: connectMetamask,
    switchChain: switchChainMetamask,
    addChain: addChainMetamask,
    sendTransaction: sendTransactionWithMetamask,
    disconnect: disconnectMetamask,
    watchAsset: watchAssetMetamask,
  },
} as const;

type Methods = keyof typeof methodsMap;

export const accountMethodFilter = atom<Methods | null>({
  key: 'accountFilter-vSwap',
  default: null,
  effects: [persistAtom],
});

export const accountState = selector({
  key: 'account-vSwap',
  get: ({ get }) => {
    const filter = get(accountMethodFilter);
    if (!filter) return null;
    if (!methodsMap[filter]) return null;
    const { accountState } = methodsMap[filter];
    return get(accountState);
  },
});

export const chainIdState = selector({
  key: 'chainIdState-vSwap',
  get: ({ get }) => {
    const filter = get(accountMethodFilter);
    if (!filter) return null;
    if (!methodsMap[filter]) return null;

    return get(methodsMap[filter].chainIdState);
  },
});

export const getAccountMethod = () => getRecoil(accountMethodFilter);
export const getAccount = () => getRecoil(accountState);

export const connect = async (method: Methods) => {
  try {
    await methodsMap[method].connect();
    setRecoil(accountMethodFilter, method);
  } catch (err) {
    throw err;
  }
};

export const disconnect = async () => {
  try {
    const currentMethod = getAccountMethod();
    if (currentMethod) {
      await methodsMap[currentMethod].disconnect();
    }
    setRecoil(accountMethodFilter, null);
  } catch (_) {}
};

export const switchChain = async () => {
  const method = getAccountMethod();
  if (!method) return;
  try {
    await methodsMap[method].switchChain('0x' + Number(Network.chainId).toString(16));
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    if ((switchError as any)?.code === 4902) {
      try {
        await methodsMap[method].addChain({
          ...Network,
          chainId: '0x' + Number(Network.chainId).toString(16),
        });
        showToast(`Add ${Network.chainName} to ${method.charAt(0).toUpperCase() + method.slice(1)} Success!`, { type: 'success' });
      } catch (addError) {
        if ((addError as any)?.code === 4001) {
          showToast('You cancel the add chain reqeust.', { type: 'error' });
        }
      }
    } else if ((switchError as any)?.code === 4001) {
      showToast('You cancel the switch chain reqeust.', { type: 'error' });
    }
  }
};

export const sendTransaction = async (params: Parameters<typeof sendTransactionWithFluent>[0]) => {
  const accountMethod = getAccountMethod();
  if (!accountMethod) {
    throw new Error('No account connected');
  }
  return methodsMap[accountMethod].sendTransaction(params);
};

export const watchAsset = (params: Parameters<typeof watchAssetFluent>[0]) => {
  const method = getAccountMethod();
  if (!method) return;
  return methodsMap[method].watchAsset(params);
};

export const useAccount = () => useRecoilValue(accountState);
export const useAccountMethod = () => useRecoilValue(accountMethodFilter);
export const useChainId = () => useRecoilValue(chainIdState);
export const useIsChainMatch = () => {
  const chainId = useChainId();
  return chainId === targetChainId;
};
