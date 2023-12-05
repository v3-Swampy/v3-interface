import { atom } from 'recoil';
import { store as fluentStore } from '@cfxjs/use-wallet-react/ethereum/Fluent';
export { connect, sendTransaction, watchAsset, addChain, switchChain } from '@cfxjs/use-wallet-react/ethereum/Fluent';

export const accountState = atom<string | null | undefined>({
  key: 'fluentAccountState-vSwap',
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
  key: 'fluentChainIdState-vSwap',
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
