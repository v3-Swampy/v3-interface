import React, { useState, useEffect, useCallback, useRef, useMemo, type ComponentProps } from 'react';
import { debounce } from 'lodash-es';
import { sendTransaction } from '@service/account';
import useI18n from '@hooks/useI18n';
import { createERC721Contract } from '@contracts/index'; // 更改为导入 ERC721 合约
import Button from '@components/Button';
import { waitTransactionReceipt } from '@utils/waitAsyncResult';
import { useAccount } from '@service/account';
import { fetchMulticall } from '@contracts/index';

export type Status = 'checking-approval' | 'need-approval' | 'approving' | 'approved';

const transitions = {
  en: {
    checking_approval: 'Checking Approval...',
    need_approval: 'Approve',
    amount_should_greater_than_zero: 'Amount should greater than zero',
  },
  zh: {
    checking_approval: '检测授权中...',
    need_approval: '授权',
    amount_should_greater_than_zero: '输入金额应该大于0',
  },
} as const;

interface Props extends ComponentProps<typeof Button> {
  tokenAddress?: string | null;
  contractAddress: string;
  tokenId: string; // 更新为 tokenId
}

// move and update from AuthTokenButton
const AuthTokenButtonOf721: React.FC<Props> = ({ children, tokenAddress, contractAddress, tokenId, ...props }) => {
  const i18n = useI18n(transitions);

  const account = useAccount();

  const tokenContract = useMemo(() => (tokenAddress ? createERC721Contract(tokenAddress) : undefined), [tokenAddress]);

  const [status, setStatus] = useState<Status>('checking-approval');

  const checkApprovalFunc = useRef<VoidFunction>();
  useEffect(() => {
    checkApprovalFunc.current = async () => {
      if (!tokenAddress || !tokenContract || !account || !contractAddress || !tokenId) return;
      try {
        setStatus('checking-approval');

        const resOfMulticall: any = await fetchMulticall([
          [tokenContract.address, tokenContract.func.interface.encodeFunctionData('getApproved', [tokenId])],
          [tokenContract.address, tokenContract.func.interface.encodeFunctionData('isApprovedForAll', [account, contractAddress])],
        ]);

        const [approvedAddress, isApprovedForAll] = [
          tokenContract.func.interface.decodeFunctionResult('getApproved', resOfMulticall[0]).toString(),
          tokenContract.func.interface.decodeFunctionResult('isApprovedForAll', resOfMulticall[1])[0],
        ];

        if (isApprovedForAll || approvedAddress.toLowerCase() === contractAddress.toLowerCase()) {
          setStatus('approved');
        } else {
          setStatus('need-approval');
        }
      } catch (err) {
        setStatus('need-approval');
        console.log('Check approval err', err);
      }
    };
  }, [tokenAddress, contractAddress, tokenId, account]);

  const checkApproval = useCallback(
    debounce(() => checkApprovalFunc.current?.(), 666),
    []
  );

  const handleApproval = useCallback(async () => {
    if (!tokenContract || !tokenAddress) return;
    try {
      setStatus('approving');

      const txHash = await sendTransaction({
        to: tokenAddress,
        data: tokenContract.func.interface.encodeFunctionData('setApprovalForAll', [contractAddress, true]),
      });

      const [receiptPromise] = waitTransactionReceipt(txHash);
      await receiptPromise;
      checkApprovalFunc.current?.();
    } catch (err) {
      setStatus('need-approval');
      console.error('Handle approval err', err);
    }
  }, []);

  useEffect(() => {
    if (status !== 'checking-approval') {
      setStatus('checking-approval');
    }
    if (!tokenId) {
      return;
    }
    checkApproval();
  }, [tokenAddress, tokenId]);

  if (!account || !tokenId || status === 'approved') return children as React.ReactElement;

  return (
    <Button id="auth-approve-btn" {...props} onClick={handleApproval} loading={status === 'approving'} disabled={status === 'checking-approval'} type="button">
      {status === 'checking-approval' ? i18n.checking_approval : i18n.need_approval}
    </Button>
  );
};

export default AuthTokenButtonOf721;
