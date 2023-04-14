import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Button from '@components/Button';
import AmountDetail from './AmountDetail';
import { type PositionForUI, usePosition } from '@service/pool-manage';
import AuthConnectButton from '@modules/AuthConnectButton';

const buttonProps = {
  className: 'mt-16px h-40px rounded-100px',
  fullWidth: true,
} as const;

const ConfirmRemove: React.FC<{ leftRemoveAmount: string; rightRemoveAmount: string }> = ({ leftRemoveAmount, rightRemoveAmount }) => {
  const { tokenId } = useParams();
  const position: PositionForUI | undefined = usePosition(Number(tokenId));

  return (
    <div>
      <AmountDetail leftRemoveAmount={leftRemoveAmount} rightRemoveAmount={rightRemoveAmount} />
      <AuthConnectButton {...buttonProps}>
        <Button onClick={() => console.log(123)} {...buttonProps}>
          Submit
        </Button>
      </AuthConnectButton>
    </div>
  );
};

export default ConfirmRemove;
