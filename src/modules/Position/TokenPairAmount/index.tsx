import React, { useMemo } from 'react';
import cx from 'clsx';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { type PositionForUI } from '@service/position';
import { formatDisplayAmount } from '@utils/numberUtils';
import { type Token, isTokenEqual } from '@service/tokens';

export const TokenItem: React.FC<{ token: Token | null | undefined; amount: string; ratio?: number | undefined; className?: string }> = ({
  token,
  amount,
  ratio,
  className,
}) => {
  return (
    <div className={cx('flex items-center justify-between text-14px leading-18px font-medium text-black-normal w-full', className)}>
      <div className="flex items-center">
        <img className="w-24px h-24px" src={token?.logoURI} alt={`${token?.logoURI} icon`} />
        <span className="ml-8px">{token?.symbol}</span>
      </div>
      <div>
        <span>{amount}</span>
        {typeof ratio === 'number' && (
          <span className="inline-block px-8px h-20px leading-20px rounded-100px bg-orange-light text-center text-14px text-orange-normal font-medium ml-8px">{ratio}%</span>
        )}
      </div>
    </div>
  );
};

const TokenPairAmount: React.FC<{
  amount0?: Unit;
  amount1?: Unit;
  ratio?: number;
  position: PositionForUI | undefined;
  leftToken?: Token;
  rightToken?: Token;
  leftAmount?: Unit;
  rightAmount?: Unit;
}> = ({ amount0, amount1, ratio, position, leftToken, rightToken, leftAmount, rightAmount }) => {
  const { token0, liquidity } = position ?? {};
  const leftTokenForUI = leftToken ? leftToken : position?.leftToken;
  const rightTokenForUI = rightToken ? rightToken : position?.rightToken;
  const isLeftTokenEqualToken0 = isTokenEqual(leftTokenForUI, token0);

  const amountLeft = leftAmount ? leftAmount : isLeftTokenEqualToken0 ? new Unit(amount0 ?? '0') : new Unit(amount1 ?? '0');
  const amountRight = rightAmount ? rightAmount : isLeftTokenEqualToken0 ? new Unit(amount1 ?? '0') : new Unit(amount0 ?? '0');
  const amountLeftStr = formatDisplayAmount(amountLeft, {
    decimals: leftTokenForUI?.decimals,
    minNum: '0.00001',
    toFixed: 5,
  });
  const amountRightStr = formatDisplayAmount(amountRight, {
    decimals: rightTokenForUI?.decimals,
    minNum: '0.00001',
    toFixed: 5,
  });
  const removed = liquidity === '0';

  const anotherRatio = useMemo(() => (typeof ratio !== 'number' ? undefined : Number((100 - ratio).toFixed(2))), [ratio]);

  if (!position) return null;
  return (
    <div className="flex flex-col gap-8px w-full">
      <TokenItem token={leftTokenForUI} amount={amountLeftStr} ratio={typeof ratio == 'number' && !removed ? (isLeftTokenEqualToken0 ? ratio : anotherRatio) : undefined} />
      <TokenItem token={rightTokenForUI} amount={amountRightStr} ratio={typeof ratio == 'number' && !removed ? (isLeftTokenEqualToken0 ? anotherRatio : ratio) : undefined} />
    </div>
  );
};

export default TokenPairAmount;
