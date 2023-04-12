import React, { useMemo } from 'react';
import { useRecoilState } from 'recoil';
import { useParams } from 'react-router-dom';
import { Unit } from '@cfxjs/use-wallet-react/conflux';
import { PositionForUI, useLiquidityDetail } from '@service/pool-manage';
import { trimDecimalZeros } from '@utils/numberUtils';
import { type Token, getUnwrapperTokenByAddress } from '@service/tokens';
import { usePool, calcAmountFromPrice, calcRatio } from '@service/pairs&pool';
import { invertedState } from '@modules/SelectedPriceRange';

const TokenItem: React.FC<{ token: Token | null; amount: string; ratio: number | undefined }> = ({ token, amount, ratio }) => {
  return (
    <div className="flex items-center justify-between text-14px leading-18px text-black-normal w-full">
      <div className="flex items-center">
        <img className="w-24px h-24px" src={token?.logoURI} alt={`${token?.logoURI} icon`} />
        <span className="ml-8px">{token?.symbol}</span>
      </div>
      <div>
        <span className="mr-8px">{amount}</span>
        {typeof ratio === 'number' && (
          <span className="inline-block px-8px h-20px leading-20px rounded-100px bg-orange-light text-center text-14px text-orange-normal font-medium">{ratio}%</span>
        )}
      </div>
    </div>
  );
};

const TokenPairAmount: React.FC<{ showRatio?: boolean }> = ({ showRatio = true }) => {
  const { tokenId } = useParams();
  const detail: PositionForUI | undefined = useLiquidityDetail(Number(tokenId));
  if (!detail) return <div>loading...</div>;
  const { token0, token1, liquidity, leftToken, rightToken, fee, tickLower, tickUpper } = detail;
  const { pool } = usePool({ tokenA: token0, tokenB: token1, fee });
  // ui token pair revert button
  const [inverted] = useRecoilState(invertedState);
  // ui init display is inverted with token1/token0
  const displayReverted = getUnwrapperTokenByAddress(token1.address)?.address === getUnwrapperTokenByAddress(rightToken?.address)?.address;
  const amountInverted = inverted !== displayReverted;
  const lower = new Unit(1.0001).pow(new Unit(tickLower));
  const upper = new Unit(1.0001).pow(new Unit(tickUpper));
  const [amount0, amount1] = useMemo(
    () => (pool?.token0Price ? calcAmountFromPrice({ liquidity, lower, current: pool?.token0Price, upper }) : []),
    [liquidity, lower.toDecimalMinUnit(), upper.toDecimalMinUnit(), pool?.token0Price?.toDecimalMinUnit()]
  );
  const tokenA = !inverted ? leftToken : rightToken;
  const tokenB = !inverted ? rightToken : leftToken;
  const amountA = !amountInverted ? amount1 : amount0;
  const amountB = !amountInverted ? amount0 : amount1;
  const amountAStr = trimDecimalZeros(amountA?.toDecimalStandardUnit(5, tokenA?.decimals));
  const amountBStr = trimDecimalZeros(amountB?.toDecimalStandardUnit(5, tokenB?.decimals));
  const removed = liquidity === '0';

  const ratio = useMemo(() => {
    return lower && pool && upper ? calcRatio(lower, pool.token0Price, upper) : undefined;
  }, [pool?.token0Price, lower.toDecimalMinUnit(), upper.toDecimalMinUnit()]);

  return (
    <div className="flex flex-col gap-8px w-full">
      <TokenItem token={tokenA} amount={amountAStr} ratio={typeof ratio == 'number' && !removed && showRatio ? (!amountInverted ? ratio : 100 - ratio) : undefined} />
      <TokenItem token={tokenB} amount={amountBStr} ratio={typeof ratio == 'number' && !removed && showRatio ? (!amountInverted ? 100 - ratio : ratio) : undefined} />
    </div>
  );
};

export default TokenPairAmount;
