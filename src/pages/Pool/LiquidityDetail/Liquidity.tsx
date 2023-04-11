import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import useI18n from '@hooks/useI18n';
import { Unit } from '@cfxjs/use-wallet-react/conflux';
import { PositionForUI, useLiquidityDetail } from '@service/pool-manage';
import { trimDecimalZeros } from '@utils/numberUtils';
import { type Token } from '@service/tokens';
import { usePool, calcAmountFromPrice, invertPrice, calcPriceFromTick } from '@service/pairs&pool';
import { getInverted } from './SelectedRange';

const transitions = {
  en: {
    liquidity: 'Liquidity',
  },
  zh: {
    liquidity: '流动性',
  },
} as const;

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

function getRatio(lower: Unit, current: Unit | null | undefined, upper: Unit) {
  try {
    if (!current) {
      return undefined;
    }
    if (!current.greaterThan(lower)) {
      return 100;
    } else if (!current.lessThan(upper)) {
      return 0;
    }

    const a = Number.parseFloat(lower.toDecimalMinUnit(15));
    const b = Number.parseFloat(upper.toDecimalMinUnit(15));
    const c = Number.parseFloat(current.toDecimalMinUnit(15));

    console.log('ratio', a, b, c);

    const ratio = Math.floor((1 / ((Math.sqrt(a * b) - Math.sqrt(b * c)) / (c - Math.sqrt(b * c)) + 1)) * 100);

    if (ratio < 0 || ratio > 100) {
      throw Error('Out of range');
    }
    return ratio;
  } catch {
    return undefined;
  }
}

const Liquidity: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const detail: PositionForUI | undefined = useLiquidityDetail(Number(tokenId));
  if (!detail) return <div>loading...</div>;
  const { token0, token1, liquidity, leftToken, rightToken, fee, priceLower: lower, priceUpper: upper, tickLower, tickUpper } = detail;
  console.log('tick', tickLower, tickUpper);
  const { pool } = usePool({ tokenA: token0, tokenB: token1, fee });
  // ui token pair revert button
  const inverted = getInverted();
  const amountInverted = token1 === rightToken && !inverted;
  const [amount0, amount1] = pool?.token0Price ? calcAmountFromPrice({ liquidity, lower, current: pool?.token0Price, upper }) : [];
  const amountA = !amountInverted ? amount0 : amount1;
  const amountB = !amountInverted ? amount1 : amount0;
  const tokenA = !inverted ? leftToken : rightToken;
  const tokenB = !inverted ? rightToken : leftToken;
  console.log(tokenA?.decimals, tokenB?.decimals);
  const amountAStr = trimDecimalZeros(amountA?.toDecimalStandardUnit(5, tokenA?.decimals));
  const amountBStr = trimDecimalZeros(amountB?.toDecimalStandardUnit(5, tokenB?.decimals));
  const removed = liquidity === '0';
  console.log('amount0', amountAStr, 'amount1', amountBStr);

  // price 0 and price1 need the best routing api, xxx USDC/token is the token price
  // const liquidity = amount0 * price0 + amount1 * price1;

  const ratio = useMemo(() => {
    return lower && pool && upper ? getRatio(lower, pool.token0Price, upper) : undefined;
  }, [pool?.token0Price, lower.toDecimalMinUnit(), upper.toDecimalMinUnit()]);

  return (
    <div className="p-16px flex bg-orange-light-hover flex-col items-start rounded-16px text-black-normal w-full">
      <span className="inline-block mb-8px text-14px leading-18px">{i18n.liquidity}</span>
      <span className="text-32px leading-40px mb-24px w-full overflow-hidden text-ellipsis whitespace-nowrap">${liquidity}</span>
      <div className="flex flex-col gap-8px w-full">
        <TokenItem
          token={tokenA}
          amount={amountAStr}
          ratio={typeof ratio == 'number' && !removed ? (!amountInverted ? ratio : 100 - ratio) : undefined}
        />
        <TokenItem
          token={tokenB}
          amount={amountBStr}
          ratio={typeof ratio == 'number' && !removed ? (!amountInverted ? 100 - ratio : ratio) : undefined}
        />
      </div>
    </div>
  );
};

export default Liquidity;
