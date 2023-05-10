import React, { Suspense, useCallback } from 'react';
import Button from '@components/Button';
import AmountDetail from '../AmountDetail';
import AuthConnectButton from '@modules/AuthConnectButton';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import { toI18n } from '@hooks/useI18n';
import useInTransaction from '@hooks/useInTransaction';
import { handleSendTransaction } from '@service/position';

const buttonProps = {
  className: 'mt-16px h-40px rounded-100px',
  fullWidth: true,
} as const;

const transitions = {
  en: {
    title: 'Remove Liquidity',
    remove: 'Remove',
  },
  zh: {
    title: 'Remove Liquidity',
    remove: 'Remove',
  },
} as const;

interface Props {
  tokenId: string;
  leftRemoveAmount: string;
  rightRemoveAmount: string;
  leftEarnedFees: string;
  rightEarnedFees: string;
  transactionParams: {
    to: string;
    data: string;
  };
  recordParams: {
    type: 'Position_RemoveLiquidity';
  };
}
const RemoveLiquidityModal: React.FC<ConfirmModalInnerProps & Props> = ({
  setNextInfo,
  transactionParams,
  leftRemoveAmount,
  rightRemoveAmount,
  tokenId,
  leftEarnedFees,
  rightEarnedFees,
  recordParams,
}) => {
  const { execTransaction: handleRemoveLiquidity } = useInTransaction(handleSendTransaction);
  const handleClickConfirm = useCallback(async () => {
    setNextInfo({ sendTransaction: () => handleRemoveLiquidity(transactionParams), recordParams });
  }, []);
  return (
    <>
      <Suspense fallback={'...'}>
        <div className="flex flex-col justify-between flex-1">
          <AmountDetail
            amountWidthStyle="w-120px"
            leftRemoveAmount={leftRemoveAmount}
            rightRemoveAmount={rightRemoveAmount}
            tokenId={tokenId}
            leftEarnedFees={leftEarnedFees}
            rightEarnedFees={rightEarnedFees}
          />
          <AuthConnectButton {...buttonProps}>
            <Button onClick={handleClickConfirm} type="button" color="orange" fullWidth className="h-48px rounded-100px mt-16px">
              Submit
            </Button>
          </AuthConnectButton>
        </div>
      </Suspense>
    </>
  );
};

const showRemoveLiquidityModal = (props: Props) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    ConfirmContent: (confirmModalInnerProps: ConfirmModalInnerProps) => <RemoveLiquidityModal {...confirmModalInnerProps} {...props} />,
    className: '!max-w-458px !min-h-400px flex flex-col',
  });
};
export default showRemoveLiquidityModal;
