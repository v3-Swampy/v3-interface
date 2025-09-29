import React, { useMemo} from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { type PositionForUI } from '@service/position';
import { trimDecimalZeros } from '@utils/numberUtils';
import { type Token, isTokenEqual } from '@service/tokens';
import { useInvertedState } from '../invertedState';

const TokenItem: React.FC<{ token: Token | null | undefined; amount: string; ratio: number | undefined }> = ({ token, amount, ratio }) => {
  return (
    <div className="flex items-center justify-between text-14px leading-18px font-medium text-black-normal w-full">
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
  tokenId: number | string | undefined;
  leftToken?: Token;
  rightToken?: Token;
  leftAmount?: Unit;
  rightAmount?: Unit;
}> = ({ amount0, amount1, ratio, position, tokenId, leftToken, rightToken, leftAmount, rightAmount }) => {
  const { token0, liquidity } = position ?? {};
  // ui token pair revert button
  const [inverted] = useInvertedState(tokenId);
  // ui init display is inverted with token1/token0
  const leftTokenForUI = leftToken ? leftToken : !inverted ? position?.leftToken : position?.rightToken;
  const rightTokenForUI = rightToken ? rightToken : !inverted ? position?.rightToken : position?.leftToken;
  const isLeftTokenEqualToken0 = isTokenEqual(leftTokenForUI, token0);

  const amountLeft = leftAmount ? leftAmount : isLeftTokenEqualToken0 ? new Unit(amount0 ?? '0') : new Unit(amount1 ?? '0');
  const amountRight = rightAmount ? rightAmount: isLeftTokenEqualToken0 ? new Unit(amount1 ?? '0') : new Unit(amount0 ?? '0');
  const amountLeftStr = trimDecimalZeros(amountLeft?.toDecimalStandardUnit(5, leftTokenForUI?.decimals));
  const amountRightStr = trimDecimalZeros(amountRight?.toDecimalStandardUnit(5, rightTokenForUI?.decimals));
  const removed = liquidity === '0';
  
  const anotherRatio = useMemo(() => typeof ratio !== 'number' ? undefined : Number((100 - ratio).toFixed(2)), [ratio]);
  
  if (!position) return null;
  return (
    <div className="flex flex-col gap-8px w-full">
      <TokenItem token={leftTokenForUI} amount={amountLeftStr} ratio={typeof ratio == 'number' && !removed ? (isLeftTokenEqualToken0 ? ratio : anotherRatio) : undefined} />
      <TokenItem token={rightTokenForUI} amount={amountRightStr} ratio={typeof ratio == 'number' && !removed ? (isLeftTokenEqualToken0 ? anotherRatio : ratio) : undefined} />
    </div>
  );
};

export default TokenPairAmount;
