import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Spin from '@components/Spin';
import useI18n from '@hooks/useI18n';
import { usePosition } from '@service/earn';
import { getUnwrapperTokenByAddress } from '@service/tokens';
import { getTokensPrice } from '@service/pairs&pool';
import { TokenItem } from '@modules/Position/TokenPairAmount';
import { formatDisplayAmount } from '@utils/numberUtils';

const transitions = {
  en: {
    unclaimed_rewards: 'Unclaimed Farming Rewards',
  },
  zh: {
    unclaimed_rewards: '待获取奖励',
  },
} as const;

const UnclaimedRewards: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const position = usePosition(Number(tokenId));

  const unclaimedRewardsInfo = useMemo(
    () =>
      position?.unclaimedRewards?.map((reward) => {
        return {
          token: getUnwrapperTokenByAddress(reward.rewardTokenInfo?.address) ?? reward.rewardTokenInfo,
          unclaimedReward: new Unit(reward.stakeReward.unclaimedReward),
        };
      }) ?? [],
    [position?.unclaimedRewards]
  );

  const [unsettledRewardsTotalPrice, setUnsettledRewardsTotalPrice] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!unclaimedRewardsInfo?.length) return;
    getTokensPrice(unclaimedRewardsInfo.map((reward) => reward.token?.address!)).then((prices) => {
      const _unsettledRewardsTotalPrice =
        unclaimedRewardsInfo?.reduce((acc, reward) => {
          const price = prices[reward.token?.address!];
          if (!price) return acc;
          return acc.add(new Unit(price).mul(reward.unclaimedReward).toDecimalStandardUnit(undefined, reward.token?.decimals));
        }, new Unit(0)) ?? new Unit(0);
      setUnsettledRewardsTotalPrice(formatDisplayAmount(_unsettledRewardsTotalPrice, { decimals: 0, minNum: '0.01', toFixed: 2, unit: '$' }));
    });
  }, [unclaimedRewardsInfo]);

  if (!position || !position.unclaimedRewards?.length) return null;
  return (
    <div className="p-16px flex bg-orange-light-hover flex-col items-start rounded-b-16px text-black-normal w-full">
      <div className="flex items-start w-full">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="inline-block mb-8px text-14px leading-18px">
            {i18n.unclaimed_rewards}
          </span>
          <span className="inline-block text-32px h-40px leading-40px mb-24px overflow-hidden text-ellipsis whitespace-nowrap">
            {unsettledRewardsTotalPrice === undefined ? <Spin /> : unsettledRewardsTotalPrice ?? '-'}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-8px w-full">
        {unclaimedRewardsInfo.map(({ token, unclaimedReward }) => (
          <TokenItem
            key={token?.address}
            token={token}
            amount={formatDisplayAmount(unclaimedReward, {
              decimals: token?.decimals,
              minNum: '0.000001',
              toFixed: 6,
            })}
          />
        ))}
      </div>
    </div>
  );
};

export default UnclaimedRewards;
