import React from 'react';
import { useParams } from 'react-router-dom';
import useI18n from '@hooks/useI18n';
import { PositionForUI, useLiquidityDetail } from '@service/pool-manage';
import TokenPairAmount from '@modules/TokenPairAmount';

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
  const detail: PositionForUI | undefined = useLiquidityDetail(Number(tokenId));
  if (!detail) return <div>loading...</div>;
  const { token0, token1, liquidity, amount0, amount1 } = detail;

  // price 0 and price1 need the best routing api, xxx USDC/token is the token price
  // const liquidity = amount0 * price0 + amount1 * price1;

  return (
    <div className="p-16px flex bg-orange-light-hover flex-col items-start rounded-16px text-black-normal w-full">
      <span className="inline-block mb-8px text-14px leading-18px">{i18n.liquidity}</span>
      <span className="text-32px leading-40px mb-24px w-full overflow-hidden text-ellipsis whitespace-nowrap">${liquidity}</span>
      <TokenPairAmount />
    </div>
  );
};

export default Liquidity;
