import React, { useState, useEffect, useCallback, useRef, useMemo, type ComponentProps } from 'react';
import { debounce } from 'lodash-es';
import { sendTransaction, Unit } from '@cfxjs/use-wallet-react/ethereum';
import useI18n, { compiled } from '@hooks/useI18n';
import { createERC20Contract } from '@contracts/index';
import Button from '@components/Button';
import { fetchChain } from '@utils/fetch';
import waitAsyncResult, { isTransactionReceipt } from '@utils/waitAsyncResult';
import { useAccount } from '@service/account';
import { useBalance } from '@service/balance';
import { getTokenByAddress } from '@service/tokens';

export type Status = 'checking-approve' | 'need-approve' | 'approving' | 'approved';

const transitions = {
  en: {
    checking_balance: 'Checking Balance...',
    insufficient_balance: 'Insufficient {token} Balance',
    need_approve: 'Need Approve',
    checking_approve: 'Checking Approve...',
  },
  zh: {
    checking_balance: '检测约中...',
    insufficient_balance: '{token} 余额不足',
    need_approve: '需要许可',
    checking_approve: '检测许可中...',
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

  const needApprove = tokenAddress !== 'CFX';
  const account = useAccount();

  const balance = useBalance(tokenAddress);
  const token = useMemo(() => getTokenByAddress(tokenAddress), [tokenAddress]);
  const tokenContract = useMemo(() => (tokenAddress ? createERC20Contract(tokenAddress) : undefined), [tokenAddress]);
  const amountUnit = useMemo(() => (amount && token?.decimals ? Unit.fromStandardUnit(amount, token.decimals) : null), [amount, token?.decimals]);

  const [status, setStatus] = useState<Status>('checking-approve');

  const checkApproveFunc = useRef<VoidFunction>();
  useEffect(() => {
    checkApproveFunc.current = async () => {
      if (!token || !amountUnit || !tokenContract || !account || !contractAddress || !amount) return;
      try {
        setStatus('checking-approve');

        const fetchRes = await fetchChain<string>({
          params: [{ data: tokenContract.func.encodeFunctionData('allowance', [account, contractAddress]), to: tokenContract.address }, 'latest'],
        });
        const allowance = tokenContract.func.decodeFunctionResult('allowance', fetchRes)?.[0];
        const approveBalance = Unit.fromMinUnit(String(allowance));

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
  }, [tokenAddress, amount]);
  const checkApprove = useCallback(
    debounce(() => checkApproveFunc.current?.(), 666),
    []
  );

  const handleApprove = useCallback(async () => {
    if (!tokenContract || !tokenAddress) return;
    try {
      setStatus('approving');
      const txHash = await sendTransaction({
        to: tokenAddress,
        data: tokenContract.func.encodeFunctionData('approve', [contractAddress, '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff']),
      });

      const [receiptPromise] = waitAsyncResult({ fetcher: () => isTransactionReceipt(txHash) });
      const txReceipt = await receiptPromise;
      checkApprove();
      return txReceipt;
    } catch (err) {
      setStatus('need-approve');
      console.error('Handle approve err', err);
    }
  }, [checkApprove]);

  useEffect(() => {
    if (status !== 'checking-approve') {
      setStatus('checking-approve');
    }
    if (!needApprove || !amount) {
      return;
    }
    checkApprove();
  }, [tokenAddress, needApprove, amount]);

  const checkingBalance = balance === null;
  const isBalanceSufficient = useMemo(() => (balance && amountUnit ? balance.greaterThanOrEqualTo(amountUnit) : null), [balance, amountUnit]);

  if (!account || !amount || (isBalanceSufficient && !needApprove) || status === 'approved') return children as React.ReactElement;

  return (
    <Button id="auth-approve-btn" {...props} onClick={handleApprove} loading={status === 'approving'} disabled={status === 'checking-approve' || !isBalanceSufficient}>
      {checkingBalance
        ? i18n.checking_balance
        : !isBalanceSufficient
        ? compiled(i18n.insufficient_balance, { token: token?.symbol ?? '' })
        : status === 'checking-approve'
        ? i18n.checking_approve
        : i18n.need_approve}
    </Button>
  );
};

export default AuthTokenButton;
