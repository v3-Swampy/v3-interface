import React, { useState, useEffect, useCallback, useRef, useMemo, useTransition, type ComponentProps } from 'react';
import { debounce } from 'lodash-es';
import { sendTransaction, Unit } from '@cfxjs/use-wallet-react/ethereum';
import useI18n from '@hooks/useI18n';
import { createERC20Contract } from '@contracts/index';
import Button from '@components/Button';
import { fetchChain } from '@utils/fetch';
import waitAsyncResult, { isTransactionReceipt } from '@utils/waitAsyncResult';
import { useAccount } from '@service/account';
import { getTokenByAddress } from '@service/tokens';

export type Status = 'checking-approve' | 'need-approve' | 'approving' | 'approved';

const transitions = {
  en: {
    need_approve: 'Need Approve',
    checking_approve: 'Checking Approve...',
  },
  zh: {
    need_approve: '需要许可',
    checking_approve: '检测许可中...',
  },
} as const;

interface Props extends ComponentProps<typeof Button> {
  tokenAddress?: string | null;
  contractAddress: string;
  amount: string;
}

const AuthApproveButton: React.FC<Props> = ({ children, tokenAddress, contractAddress, amount, ...props }) => {
  const i18n = useI18n(transitions);
  const [isPending, startTransition] = useTransition();

  const needApprove = tokenAddress !== 'CFX';
  const account = useAccount();
  const [status, setStatus] = useState<Status>('checking-approve');
  const tokenContract = useMemo(() => (tokenAddress ? createERC20Contract(tokenAddress) : undefined), [tokenAddress]);

  const checkApproveFunc = useRef<VoidFunction>();
  useEffect(() => {
    checkApproveFunc.current = async () => {
      const token = getTokenByAddress(tokenAddress);
      if (!token || !tokenContract || !account || !contractAddress || !amount) return;
      try {
        setStatus('checking-approve');

        const fetchRes = await fetchChain<string>({
          params: [{ data: tokenContract.func.encodeFunctionData('allowance', [account, contractAddress]), to: tokenContract.address }, 'latest'],
        });
        const allowance = tokenContract.func.decodeFunctionResult('allowance', fetchRes)?.[0];
        const amountUnit = Unit.fromStandardUnit(amount, token.decimals);
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

  if (!account || !amount || !needApprove || status === 'approved') return children as React.ReactElement;

  return (
    <Button id="auth-approve-btn" {...props} onClick={handleApprove} loading={status === 'approving'} disabled={status === 'checking-approve'}>
      {status === 'checking-approve' && !isPending ? i18n.checking_approve : i18n.need_approve}
    </Button>
  );
};

export default AuthApproveButton;
