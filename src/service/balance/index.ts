import { useCallback, useEffect } from 'react';
import { atomFamily, useRecoilStateLoadable } from 'recoil';
import { setRecoil } from 'recoil-nexus';
import { throttle } from 'lodash-es';
import { fetchChain } from '@utils/fetch';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { useAccount } from '@service/account';
import { useUserActiveStatus, UserActiveStatus } from '@service/userActiveStatus';

const balanceState = atomFamily<string | null, string>({
  key: `balanceState-${import.meta.env.MODE}`,
});

const fetchBalance = async ({ account, tokenAddress }: { account: string; tokenAddress: string }) => {
  let fetchPromise: Promise<string>;
  if (tokenAddress === 'CFX') {
    fetchPromise = fetchChain({
      method: 'eth_getBalance',
      params: [account, 'latest'],
    });
  } else {
    fetchPromise = fetchChain({
      params: [
        {
          data: '0x70a08231000000000000000000000000' + account.slice(2),
          to: tokenAddress,
        },
        'latest',
      ],
    });
  }
  return await fetchPromise;
};

const balanceTracker = new Map<string, boolean>();
/**
 * get and continuously track the balance of a token.
 * tracker for the same token, only one should exist at the same time.
 * The balance will be updated every 5 seconds when the user is active, and every 20 seconds when the user is inactive.
 */
export const useBalance = (tokenAddress?: string | null) => {
  const userActiveStatus = useUserActiveStatus();
  const account = useAccount();
  const balanceKey = `${account ?? 'WaitSignIn'}:${tokenAddress}`;

  const [{ state, contents }, setBalance] = useRecoilStateLoadable(balanceState(balanceKey));
  const fetchAndSetBalance = useCallback(
    throttle(() => account && tokenAddress && fetchBalance({ account, tokenAddress }).then((balanceStr) => balanceStr && setBalance(balanceStr)), 2000),
    [account, tokenAddress]
  );

  useEffect(() => {
    if (!account || !tokenAddress || balanceTracker.has(balanceKey)) {
      return;
    }

    balanceTracker.set(balanceKey, true);
    fetchAndSetBalance();
    const timer = setInterval(fetchAndSetBalance, userActiveStatus === UserActiveStatus.Active ? 5000 : 20000);

    return () => {
      balanceTracker.delete(balanceKey);
      clearInterval(timer);
    };
  }, [account, tokenAddress, userActiveStatus]);

  if (state === 'hasValue' && contents) return !!account && !!contents && !!tokenAddress ? Unit.fromMinUnit(contents) : null;
  return null;
};

/**
 * Force to get the latest value of balance.
 * Usually used after a transaction is completed.
 */
export const updateBalance = async ({ account, tokenAddress }: { account: string; tokenAddress: string }) => {
  const balanceStr = await fetchBalance({ account, tokenAddress });
  const balanceKey = `${account ?? 'WaitSignIn'}:${tokenAddress}`;
  setRecoil(balanceState(balanceKey), balanceStr);
};
