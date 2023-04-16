import React, { useState } from 'react';
import Button from '@components/Button';
import AmountDetail from './AmountDetail';
import AuthConnectButton from '@modules/AuthConnectButton';

const buttonProps = {
  className: 'mt-16px h-40px rounded-100px',
  fullWidth: true,
} as const;

const ConfirmRemove: React.FC<{
  tokenId: string;
  leftRemoveAmount: string;
  rightRemoveAmount: string;
  leftEarnedFees: string;
  rightEarnedFees: string;
  onConfirmRemove: () => void;
}> = ({ leftRemoveAmount, rightRemoveAmount, onConfirmRemove, tokenId, leftEarnedFees, rightEarnedFees }) => {
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <AmountDetail
        amountWidthStyle="w-120px"
        leftRemoveAmount={leftRemoveAmount}
        rightRemoveAmount={rightRemoveAmount}
        tokenId={tokenId}
        leftEarnedFees={leftEarnedFees}
        rightEarnedFees={rightEarnedFees}
      />
      <AuthConnectButton {...buttonProps}>
        <Button
          loading={loading}
          onClick={async () => {
            setLoading(true);
            await onConfirmRemove();
            setLoading(false);
          }}
          type="button"
          color="orange"
          fullWidth
          className="h-48px rounded-100px mt-16px"
        >
          Submit
        </Button>
      </AuthConnectButton>
    </div>
  );
};

export default ConfirmRemove;
