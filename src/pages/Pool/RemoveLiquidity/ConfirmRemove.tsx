import React, { useMemo } from 'react';
import Button from '@components/Button';
import AmountDetail from './AmountDetail';
import { type PositionForUI } from '@service/pool-manage';
import AuthConnectButton from '@modules/AuthConnectButton';

const buttonProps = {
  className: 'mt-16px h-40px rounded-100px',
  fullWidth: true,
} as const;

const ConfirmRemove: React.FC<{ detail: PositionForUI; leftRemoveAmount: string; rightRemoveAmount: string }> = ({ detail, leftRemoveAmount, rightRemoveAmount }) => {
  return (
    <div>
      <AmountDetail detail={detail} leftRemoveAmount={leftRemoveAmount} rightRemoveAmount={rightRemoveAmount} />
      <AuthConnectButton {...buttonProps}>
        <Button onClick={() => console.log(123)} {...buttonProps}>
          Submit
        </Button>
      </AuthConnectButton>
    </div>
  );
};

export default ConfirmRemove;
