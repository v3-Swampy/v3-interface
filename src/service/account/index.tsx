import { atom, selector, useRecoilValue } from 'recoil';
import { setRecoil, getRecoil } from 'recoil-nexus';
import { persistAtom } from '@utils/recoilUtils';
import {
  accountState as fluentAccountState,
  chainIdState as fluentChainIdState,
  connect as connectFluent,
  disconnect as disconnectFluent,
  switchChain as switchChainFluent,
  sendTransaction as sendTransactionWithFluent,
} from './fluent';
import {
  accountState as metamaskAccountState,
  chainIdState as metamaskChainIdState,
  connect as connectMetamask,
  disconnect as disconnectMetamask,
  switchChain as switchChainMetamask,
  sendTransaction as sendTransactionWithMetamask,
} from './metamask';
import { isProduction } from '@utils/is';
export const targetChainId = isProduction ? '1030' : '71';

const methodsMap = {
  fluent: {
    accountState: fluentAccountState,
    chainIdState: fluentChainIdState,
    connect: connectFluent,
    switchChain: switchChainFluent,
    sendTransaction: sendTransactionWithFluent,
    disconnect: disconnectFluent,
  },
  metamask: {
    accountState: metamaskAccountState,
    chainIdState: metamaskChainIdState,
    connect: connectMetamask,
    switchChain: switchChainMetamask,
    sendTransaction: sendTransactionWithMetamask,
    disconnect: disconnectMetamask,
  },
} as const;

type Methods = keyof typeof methodsMap;

export const accountMethodFilter = atom<Methods | null>({
  key: 'accountFilter',
  default: null,
  effects: [persistAtom],
});

export const accountState = selector({
  key: 'account',
  get: ({ get }) => {
    const filter = get(accountMethodFilter);
    if (!filter) return null;

    const { accountState } = methodsMap[filter];
    return get(accountState);
  },
});

export const chainIdState = selector({
  key: 'chainIdState',
  get: ({ get }) => {
    const filter = get(accountMethodFilter);
    if (!filter) return null;

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

export const disconnect = async (method: Methods) => {
  try {
    await methodsMap[method].disconnect();
    setRecoil(accountMethodFilter, null);
  } catch (_) {}
};

export const switchChain = () => {
  const method = getAccountMethod();
  if (!method) return;
  methodsMap[method].switchChain();
};

export const sendTransaction = async (params: Parameters<typeof sendTransactionWithFluent>[0] & { from: string }) => {
  const accountMethod = getAccountMethod();
  if (!accountMethod) {
    throw new Error('No account connected');
  }
  return methodsMap[accountMethod].sendTransaction(params) as unknown as string;
};

export const useAccount = () => useRecoilValue(accountState);
export const useAccountMethod = () => useRecoilValue(accountMethodFilter);
export const useChainId = () => useRecoilValue(chainIdState);
export const useIsChainMatch = () => {
  const chainId = useChainId();
  return chainId === targetChainId;
};
