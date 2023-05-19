import { atom } from 'recoil';
import { store as fluentStore } from '@cfxjs/use-wallet-react/ethereum';
export { connect, sendTransaction, watchAsset, addChain, switchChain } from '@cfxjs/use-wallet-react/ethereum';

export const accountState = atom<string | null | undefined>({
  key: 'metamaskAccountState-vSwap',
  default: undefined,
  effects: [
    ({ setSelf, trigger }) => {
      if (trigger === 'get') {
        setSelf(fluentStore.getState().accounts?.[0]);
      }

      const unsubFluentAccount = fluentStore.subscribe(
        (state) => state.accounts,
        (accounts) => setSelf(accounts?.[0])
      );
      return unsubFluentAccount;
    },
  ],
});

export const chainIdState = atom<string | null | undefined>({
  key: 'metamaskChainIdState-vSwap',
  default: undefined,
  effects: [
    ({ setSelf, trigger }) => {
      if (trigger === 'get') {
        setSelf(fluentStore.getState().chainId);
      }

      const unsubFluentAccount = fluentStore.subscribe(
        (state) => state.chainId,
        (chainId) => setSelf(chainId)
      );
      return unsubFluentAccount;
    },
  ],
});

export const disconnect = () => Promise<void>;