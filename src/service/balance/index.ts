import { useCallback, useEffect } from 'react';
import { atomFamily, useRecoilStateLoadable } from 'recoil';
import { setRecoil } from 'recoil-nexus';
import { throttle } from 'lodash-es';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { useAccount } from '@service/account';
import { useUserActiveStatus, UserActiveStatus } from '@service/userActiveStatus';

const balanceState = atomFamily<string | null, string>({
  key: 'balanceState',
});

const fetchBalance = async ({ account, address }: { account: string; address: string }) => {
  let fetchPromise: Promise<Response>;
  if (address === 'CFX') {
    fetchPromise = fetch(import.meta.env.VITE_ESpaceRpcUrl, {
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [account, 'latest'],
        id: 1,
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
  } else {
    fetchPromise = fetch(import.meta.env.VITE_ESpaceRpcUrl, {
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [
          {
            data: '0x70a08231000000000000000000000000' + account.slice(2),
            to: address,
          },
          'latest',
        ],
        id: 1,
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });
  }
  const response = await fetchPromise;
  const res = await response.json();
  return res?.result === '0x' ? '' : (res?.result as string);
};


const balanceTracker = new Map<string, boolean>();
/** 
 * get and continuously track the balance of a token.
 * tracker for the same token, only one should exist at the same time.
 * The balance will be updated every 5 seconds when the user is active, and every 20 seconds when the user is inactive.
 */ 
export const useBalance = (address: string) => {
  const userActiveStatus = useUserActiveStatus();
  const account = useAccount();

  const [{ state, contents }, setBalance] = useRecoilStateLoadable(balanceState(`${account ?? 'WaitSignIn'}:${address}`));
  const fetchAndSetBalance = useCallback(
    throttle(() => account && fetchBalance({ account, address }).then((balanceStr) => balanceStr && setBalance(balanceStr)), 2500),
    [account, address]
  );

  useEffect(() => {
    if (!account || !address || balanceTracker.has(`${account}:${address}`)) {
      return;
    }

    balanceTracker.set(`${account}:${address}`, true);
    fetchAndSetBalance();
    const timer = setInterval(fetchAndSetBalance, userActiveStatus === UserActiveStatus.Active ? 5000 : 20000);

    return () => {
      balanceTracker.delete(`${account}:${address}`);
      clearInterval(timer);
    };
  }, [account, address, userActiveStatus]);

  if (state === 'hasValue' && contents) return !!account && !!contents ? Unit.fromMinUnit(contents) : null;
  return null;
};


/** 
 * Force to get the latest value of balance.
 * Usually used after a transaction is completed.
 */ 
export const updateBalance = async ({ account, address }: { account: string; address: string }) => {
  const balanceStr = await fetchBalance({ account, address });
  setRecoil(balanceState(`${account}:${address}`), balanceStr);
};
