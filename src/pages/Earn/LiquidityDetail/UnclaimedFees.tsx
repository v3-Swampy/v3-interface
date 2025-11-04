import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Spin from '@components/Spin';
import useI18n from '@hooks/useI18n';
import Button from '@components/Button';
import { usePosition, usePositionFees, useIsPositionOwner } from '@service/earn';
import { useTokenPrice, getTokensPrice } from '@service/pairs&pool';
import TokenPairAmount from '@modules/Position/TokenPairAmount';
import { formatDisplayAmount } from '@utils/numberUtils';
import showCollectFeesModal from './CollectFeesModal';

const transitions = {
  en: {
    collect_fees: 'Collect',
    unclaimed_fees: 'Unclaimed Fees',
  },
  zh: {
    collect_fees: '获取',
    unclaimed_fees: '待获取收益',
  },
} as const;

const UnclaimedFees: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const position = usePosition(Number(tokenId));
  const { token0, token1 } = position ?? {};
  const [fee0, fee1] = usePositionFees(Number(tokenId));
  const token0Price = useTokenPrice(token0?.address);
  const token1Price = useTokenPrice(token1?.address);
  const token0Fee = token0Price && fee0 ? fee0.mul(token0Price).toDecimalStandardUnit(undefined, token0?.decimals) : '0';
  const token1Fee = token1Price && fee1 ? fee1.mul(token1Price).toDecimalStandardUnit(undefined, token1?.decimals) : '0';
  const fee =
    token0Fee && token1Fee
      ? formatDisplayAmount(new Unit(token0Fee).add(token1Fee), {
          decimals: 0,
          minNum: '0.00001',
          toFixed: 5,
          unit: '$',
        })
      : '-';
  const isOwner = useIsPositionOwner(Number(tokenId));

    const [unsettledRewardsTotalPrice, setUnsettledRewardsTotalPrice] = useState<Unit | null | undefined>(undefined);

  useEffect(() => {
    if (!position?.activeRewards?.length) return;
    getTokensPrice(position?.activeRewards.map((reward, index) => reward.rewardTokenInfo.address)).then((prices) => {
      const unsettledRewardsTotalPrice =
        position?.activeRewards?.reduce((acc, reward) => {
          const price = prices[reward.rewardTokenInfo.address];
          if (!price) return acc;
          return acc.add(new Unit(price).mul(new Unit(reward.stakeReward.unsettledReward).toDecimalStandardUnit(undefined, reward.rewardTokenInfo.decimals)));
        }, new Unit(0)) ?? new Unit(0);
      setUnsettledRewardsTotalPrice(unsettledRewardsTotalPrice);
    });
  }, []);


  if (!position) return null;
  return (
    <div className="p-16px flex bg-orange-light-hover flex-col items-start rounded-16px text-black-normal w-full">
      <div className="flex items-start w-full">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="inline-block mb-8px text-14px leading-18px">{i18n.unclaimed_fees}</span>
          <span className="inline-block text-32px h-40px leading-40px mb-24px overflow-hidden text-ellipsis whitespace-nowrap">
            {!token0Price || !token1Price ? <Spin /> : fee}
          </span>
        </div>
        {isOwner && (
          <Button
            className="px-24px h-40px rounded-100px text-14px font-normal"
            disabled={token0Fee === '0' && token1Fee === '0' && unsettledRewardsTotalPrice?.equals(new Unit(0))}
            color="gradient"
            onClick={() => showCollectFeesModal({ position, fee0, fee1, tokenId: Number(tokenId) })}
          >
            {i18n.collect_fees}
          </Button>
        )}
      </div>
      <TokenPairAmount amount0={new Unit(fee0 ?? 0)} amount1={new Unit(fee1 ?? 0)} position={position} />
    </div>
  );
};

export default UnclaimedFees;
