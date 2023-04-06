import React, { useMemo } from 'react';
import Button from '@components/Button';
import { getWrapperTokenByAddress } from '@service/tokens';
import AuthConnectButton from '@modules/AuthConnectButton';
import AuthTokenButton from '@modules/AuthTokenButton';
import { NonfungiblePositionManager } from '@contracts/index';
import { useTokenA, useTokenB } from './SelectPair';

const SubmitButton: React.FC<{ amountTokenA: string; amountTokenB: string }> = ({ amountTokenA, amountTokenB }) => {
  const tokenA = useTokenA()!;
  const tokenB = useTokenB()!;
  const wrappredTokenA = useMemo(() => getWrapperTokenByAddress(tokenA?.address), [tokenA?.address]);
  const wrappredTokenB = useMemo(() => getWrapperTokenByAddress(tokenB?.address), [tokenB?.address]);

  return (
    <AuthConnectButton {...buttonProps}>
      <AuthTokenButton {...buttonProps} tokenAddress={wrappredTokenA?.address} contractAddress={NonfungiblePositionManager.address} amount={amountTokenA}>
        <AuthTokenButton {...buttonProps} tokenAddress={wrappredTokenB?.address} contractAddress={NonfungiblePositionManager.address} amount={amountTokenB}>
          <Button {...buttonProps}>Submit</Button>
        </AuthTokenButton>
      </AuthTokenButton>
    </AuthConnectButton>
  );
};

const buttonProps = {
  className: 'mt-16px h-40px rounded-100px',
  fullWidth: true,
} as const;

export default SubmitButton;
