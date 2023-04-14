import React from 'react';
import Button from '@components/Button';
import AmountDetail from './AmountDetail';
import AuthConnectButton from '@modules/AuthConnectButton';

const buttonProps = {
  className: 'mt-16px h-40px rounded-100px',
  fullWidth: true,
} as const;

const ConfirmRemove: React.FC<{ tokenId: string; leftRemoveAmount: string; rightRemoveAmount: string; onConfirmRemove: () => void }> = ({
  leftRemoveAmount,
  rightRemoveAmount,
  onConfirmRemove,
  tokenId,
}) => {
  return (
    <div>
      <AmountDetail leftRemoveAmount={leftRemoveAmount} rightRemoveAmount={rightRemoveAmount} tokenId={tokenId} />
      <AuthConnectButton {...buttonProps}>
        <Button onClick={onConfirmRemove}>Submit</Button>
      </AuthConnectButton>
    </div>
  );
};

export default ConfirmRemove;
