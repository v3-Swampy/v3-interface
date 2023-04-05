import React, { useMemo } from 'react';
import Button from '@components/Button';
import { getWrapperTokenByAddress } from '@service/tokens';
import AuthConnectButton from '@modules/AuthConnectButton';
import AuthTokenButton from '@modules/AuthTokenButton';
import { NonfungiblePositionManager } from '@contracts/index';
import { addLiquidity } from '@service/pool';
import { useTokenA, useTokenB } from './SelectPair';
import { useCurrentFee } from './SelectFeeTier';

const SubmitButton: React.FC<{ amountTokenA: string; amountTokenB: string }> = ({ amountTokenA, amountTokenB }) => {
  const tokenA = useTokenA()!;
  const tokenB = useTokenB()!;
  const wrappredTokenA = useMemo(() => getWrapperTokenByAddress(tokenA?.address), [tokenA?.address]);
  const wrappredTokenB = useMemo(() => getWrapperTokenByAddress(tokenB?.address), [tokenB?.address]);
  const fee = useCurrentFee();

  return (
    <AuthConnectButton {...buttonProps}>
      <AuthTokenButton {...buttonProps} tokenAddress={wrappredTokenA?.address} contractAddress={NonfungiblePositionManager.address} amount={amountTokenA}>
        <AuthTokenButton {...buttonProps} tokenAddress={wrappredTokenB?.address} contractAddress={NonfungiblePositionManager.address} amount={amountTokenB}>
          <Button
            {...buttonProps}
            type="button"
            onClick={() =>
              addLiquidity({
                fee,
                'amount-tokenA': '20',
                'amount-tokenB': '5',
                'price-lower': '4.5',
                'price-upper': '5.5',
                tokenA,
                tokenB,
              })
            }
          >
            Submit
          </Button>
        </AuthTokenButton>
      </AuthTokenButton>
    </AuthConnectButton>
  );
};

const buttonProps = {
  className: 'mt-auto h-40px rounded-100px',
  fullWidth: true,
} as const;

export default SubmitButton;
