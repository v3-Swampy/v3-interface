import React from 'react';
import Button from '@components/Button';
import { addLiquidity } from '@service/pool';
import { usePool } from '@service/pairs&pool';
import { useTokenA, useTokenB } from './SelectPair';
import { useCurrentFee } from './SelectFeeTier';

const SubmitButton: React.FC = () => {
  const tokenA = useTokenA()!;
  const tokenB = useTokenB()!;
  const fee = useCurrentFee();
  const pool = usePool({ tokenA, tokenB, fee })!;

  return (
    <Button
      fullWidth
      className="mt-auto h-40px rounded-100px"
      type="button"
      onClick={() =>
        addLiquidity({
          fee,
          'amount-tokenA': '20',
          'amount-tokenB': '5',
          'price-lower': '4.5',
          'price-upper': '5.5',
          pool,
          tokenA,
          tokenB,
        })
      }
    >
      Submib
    </Button>
  );
};

export default SubmitButton;
