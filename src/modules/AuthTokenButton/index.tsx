import React, { useState, useEffect, useCallback, useRef, useMemo, type ComponentProps } from 'react';
import { debounce } from 'lodash-es';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { sendTransaction } from '@service/account';
import useI18n, { compiled } from '@hooks/useI18n';
import { createERC20Contract } from '@contracts/index';
import Button from '@components/Button';
import { fetchChain } from '@utils/fetch';
import { waitTransactionReceipt } from '@utils/waitAsyncResult';
import { useAccount } from '@service/account';
import { useBalance } from '@service/balance';
import { getTokenByAddress } from '@service/tokens';

import AuthTokenButtonOf721 from './AuthTokenButtonOf721';

const Zero = new Unit(0);

export type Status = 'checking-approve' | 'need-approve' | 'approving' | 'approved';

const transitions = {
  en: {
    checking_balance: 'Checking Balance...',
    insufficient_balance: 'Insufficient {token} Balance',
    need_approve: '{token} Need Approve',
    checking_approve: 'Checking Approve...',
    amount_should_greater_than_zero: 'Amount should greater than zero',
  },
  zh: {
    checking_balance: '检测约中...',
    insufficient_balance: '{token} 余额不足',
    need_approve: '{token} 需要许可',
    checking_approve: '检测许可中...',
    amount_should_greater_than_zero: '输入金额应该大于0',
  },
} as const;

interface Props extends ComponentProps<typeof Button> {
  tokenAddress?: string | null;
  contractAddress: string;
  amount: string;
}

/**
 * Detects whether a token has sufficient balance / sufficient approve amount.
 * If the detection passes, the children element is displayed. (The priority of the balance is higher than approve)
 * Otherwise, the insufficient amount tip and the button with the approve function are displayed.
 */
const AuthTokenButton: React.FC<Props> = ({ children, tokenAddress, contractAddress, amount, ...props }) => {
  const i18n = useI18n(transitions);

  const account = useAccount();

  const token = useMemo(() => getTokenByAddress(tokenAddress), [tokenAddress]);
  const tokenContract = useMemo(() => (token?.address ? createERC20Contract(token.address) : undefined), [token?.address]);
  const amountUnit = useMemo(() => (amount && token?.decimals ? Unit.fromStandardUnit(amount, token.decimals) : null), [amount, token?.decimals]);
  const balance = useBalance(token?.address);
  const needApprove = token?.address !== 'CFX';
  const [status, setStatus] = useState<Status>('checking-approve');

  const checkApproveFunc = useRef<VoidFunction>();
  useEffect(() => {
    checkApproveFunc.current = async () => {
      if (!token || !amountUnit || !tokenContract || !account || !contractAddress || !amount) return;
      try {
        setStatus('checking-approve');

        const fetchRes = await fetchChain<string>({
          params: [{ data: tokenContract.func.interface.encodeFunctionData('allowance', [account, contractAddress]), to: tokenContract.address }, 'latest'],
        });
        const allowance = tokenContract.func.interface.decodeFunctionResult('allowance', fetchRes)?.[0];
        const approveBalance = new Unit(String(allowance));
        if (approveBalance.greaterThanOrEqualTo(amountUnit)) {
          setStatus('approved');
        } else {
          setStatus('need-approve');
        }
      } catch (err) {
        setStatus('need-approve');
        console.log('Check approve err', err);
      }
    };
  }, [token?.address, contractAddress, amount, account]);

  const checkApprove = useCallback(
    debounce(() => checkApproveFunc.current?.(), 666),
    []
  );

  const handleApprove = useCallback(async () => {
    if (!tokenContract || !token?.address) return;
    try {
      setStatus('approving');
      const txHash = await sendTransaction({
        to: token?.address,
        data: tokenContract.func.interface.encodeFunctionData('approve', [contractAddress, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff']),
      });

      const [receiptPromise] = waitTransactionReceipt(txHash);
      await receiptPromise;
      checkApproveFunc.current?.();
    } catch (err) {
      setStatus('need-approve');
      console.error('Handle approve err', err);
    }
  }, [tokenAddress, contractAddress, checkApproveFunc.current]);

  useEffect(() => {
    if (status !== 'checking-approve') {
      setStatus('checking-approve');
    }
    if (!needApprove || !amount) {
      return;
    }
    checkApprove();
  }, [token?.address, needApprove, amount]);

  const checkingBalance = balance === null;
  const isAmountGreateThanZero = amountUnit ? amountUnit.greaterThan(Zero) : false;
  const isBalanceSufficient = useMemo(() => (balance && amountUnit ? balance.greaterThanOrEqualTo(amountUnit) : null), [balance, amountUnit]);

  if (!account || !amount || (isAmountGreateThanZero && isBalanceSufficient && (!needApprove || status === 'approved'))) return children as React.ReactElement;

  return (
    <Button
      id="auth-approve-btn"
      {...props}
      onClick={handleApprove}
      loading={status === 'approving'}
      disabled={status === 'checking-approve' || !isBalanceSufficient}
      type="button"
    >
      {!isAmountGreateThanZero
        ? i18n.amount_should_greater_than_zero
        : checkingBalance
        ? i18n.checking_balance
        : !isBalanceSufficient
        ? compiled(i18n.insufficient_balance, { token: token?.symbol ?? '' })
        : status === 'checking-approve'
        ? i18n.checking_approve
        : compiled(i18n.need_approve, { token: token?.symbol ?? '' })}
    </Button>
  );
};

export default AuthTokenButton;

export { AuthTokenButtonOf721 };
