import { atom } from 'recoil';
import { useChainId, switchChain as _switchChain, getCurrentWalletName, store } from '@cfx-kit/react-utils/dist/AccountManage';
import { showToast } from '@components/showPopup';
import { Network, targetChainId } from './Network';
export { sendTransaction, watchAsset, useAccount, useChainId, connect, disconnect, getAccount, getCurrentWalletName } from '@cfx-kit/react-utils/dist/AccountManage';
export * from './Network';


export const accountState = atom<string | null | undefined>({
  key: 'account-WallFreeX',
  default: undefined,
  effects: [
    ({ setSelf, trigger }) => {
      if (trigger === 'get') {
        setSelf(store.getState().account);
      }

      const unsubAccount = store.subscribe(
        (state) => state.account,
        (account) => setSelf(account)
      );
      return unsubAccount;
    },
  ],
});


export const switchChain = async () => {
  const currentWalletName = getCurrentWalletName();
  if (!currentWalletName) return;

  await _switchChain(Network.chainId, {
    addChainParams: {
      ...Network,
      chainId: '0x' + Number(Network.chainId).toString(16)
    },
    addChainCallback: () => {
      showToast(`Add ${Network.chainName} to ${currentWalletName} Success!`, { type: 'success' });
    },
    cancleAddCallback: () => {
      showToast('You cancel the add chain reqeust.', { type: 'error' });
    },
    cancelSwitchCallback: () => {
      showToast('You cancel the switch chain reqeust.', { type: 'error' });
    }
  });
};

export const useIsChainMatch = () => {
  const chainId = useChainId();
  return chainId === targetChainId;
};
