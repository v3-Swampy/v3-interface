import React from 'react';
import { useParams } from 'react-router-dom';
import useI18n from '@hooks/useI18n';
import { usePosition } from '@service/position';
import { useTokenPrice } from '@service/pairs&pool';
import TokenPairAmount from '@modules/Position/TokenPairAmount';

const transitions = {
  en: {
    liquidity: 'Liquidity',
  },
  zh: {
    liquidity: '流动性',
  },
} as const;

const Liquidity: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const position = usePosition(Number(tokenId));
  const { amount0, amount1, ratio, token0, token1, liquidity } = position ?? {};

  const token0Price = useTokenPrice(token0?.address);
  const token1Price = useTokenPrice(token1?.address)
  // const liquidity = amount0?.mul(token0Price)

  // price 0 and price1 need the best routing api, xxx USDC/token is the token price
  // const liquidity = amount0 * price0 + amount1 * price1;
  if (!position) return null;
  return (
    <div className="p-16px flex bg-orange-light-hover flex-col items-start rounded-16px text-black-normal w-full">
      <span className="inline-block mb-8px text-14px leading-18px">{i18n.liquidity}</span>
      <span className="text-32px leading-40px mb-24px w-full overflow-hidden text-ellipsis whitespace-nowrap">${liquidity}</span>
      <TokenPairAmount amount0={amount0} amount1={amount1} ratio={ratio} position={position} tokenId={tokenId}/>
    </div>
  );
};

export default Liquidity;
