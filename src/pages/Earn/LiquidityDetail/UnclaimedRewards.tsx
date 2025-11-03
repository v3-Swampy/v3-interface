import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Decimal from 'decimal.js';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Spin from '@components/Spin';
import useI18n from '@hooks/useI18n';
import Button from '@components/Button';
import { usePosition, usePositionFees, useIsPositionOwner } from '@service/earn';
import { getUnwrapperTokenByAddress } from '@service/tokens';
import { getTokensPrice } from '@service/pairs&pool';
import { TokenItem } from '@modules/Position/TokenPairAmount';
import { formatDisplayAmount } from '@utils/numberUtils';
import showCollectFeesModal from './CollectFeesModal';

const transitions = {
  en: {
    claim_rewards: 'Claim Rewards',
    unclaimed_rewards: 'Unclaimed Rewards',
  },
  zh: {
    claim_rewards: '获取奖励',
    unclaimed_rewards: '待获取奖励',
  },
} as const;

const UnclaimedRewards: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const position = usePosition(Number(tokenId));
  const [fee0, fee1] = usePositionFees(Number(tokenId));

  const activeRewardsInfo = useMemo(
    () =>
      position?.activeRewards?.map((reward) => {
        const rewardPerSecond = new Decimal(reward.stakeReward.rewardsPerSecondX32.toString()).div(Math.pow(2, 32))
        const rewardPerDay = new Unit(rewardPerSecond).mul(86400)
        return ({
          wrapperTokenAddress: reward.rewardTokenInfo.address,
          token: getUnwrapperTokenByAddress(reward.rewardTokenInfo.address) ?? reward.rewardTokenInfo,
          unsettledReward: new Unit(reward.stakeReward.unsettledReward).toDecimalStandardUnit(6, reward.rewardTokenInfo.decimals),
          rewardPerDay: rewardPerDay.toDecimalMinUnit(),
          rewardPerDayDisplay: rewardPerDay.toDecimalStandardUnit(6, reward.rewardTokenInfo.decimals),
        })
      }) ?? [],
    [position?.activeRewards]
  );

  const [unsettledRewardsTotalPrice, setUnsettledRewardsTotalPrice] = useState<string | null | undefined>(undefined);
  const [expectedRewardPerDayTotalPrice, setExpectedRewardPerDayTotalPrice] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!position?.activeRewards?.length) return;
    getTokensPrice(position?.activeRewards.map((reward, index) => reward.rewardTokenInfo.address)).then((prices) => {
      const _unsettledRewardsTotalPrice =
        position?.activeRewards?.reduce((acc, reward) => {
          const price = prices[reward.rewardTokenInfo.address];
          if (!price) return acc;
          return acc.add(new Unit(price).mul(new Unit(reward.stakeReward.unsettledReward).toDecimalStandardUnit(undefined, reward.rewardTokenInfo.decimals)));
        }, new Unit(0)) ?? new Unit(0);
        const _expectedRewardPerDayTotalPrice =
          activeRewardsInfo?.reduce((acc, reward) => {
            const price = prices[reward.wrapperTokenAddress];
            if (!price) return acc;
            return acc.add(new Unit(price).mul(new Unit(reward.rewardPerDay).toDecimalStandardUnit(undefined, reward.token.decimals)));
          }, new Unit(0)) ?? new Unit(0);
        setUnsettledRewardsTotalPrice(formatDisplayAmount(_unsettledRewardsTotalPrice, { decimals: 0, minNum: '0.00001', toFixed: 5, unit: '$' }));
        setExpectedRewardPerDayTotalPrice(formatDisplayAmount(_expectedRewardPerDayTotalPrice, { decimals: 0, minNum: '0.00001', toFixed: 5, unit: '$' }));
    });
  }, [activeRewardsInfo]);


  const isOwner = useIsPositionOwner(Number(tokenId));
  if (!position || !position.activeRewards?.length || !isOwner) return null;
  return (
    <>
      <div className="p-16px flex bg-orange-light-hover flex-col items-start rounded-16px text-black-normal w-full">
        <div className="flex items-start w-full">
          <div className="flex flex-col flex-1 min-w-0">
            <span className="inline-block mb-8px text-14px leading-18px">{i18n.unclaimed_rewards}</span>
            <span className="inline-block text-32px h-40px leading-40px mb-24px overflow-hidden text-ellipsis whitespace-nowrap">
              {unsettledRewardsTotalPrice === undefined ? <Spin /> : unsettledRewardsTotalPrice ?? '-'}
            </span>
          </div>
          {position.activeRewards?.length > 0 && (
            <Button
              className="px-24px h-40px rounded-100px text-14px font-normal"
              color="gradient"
              onClick={() => showCollectFeesModal({ position, fee0, fee1, tokenId: Number(tokenId) })}
            >
              {i18n.claim_rewards}
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-8px w-full">
          {activeRewardsInfo.map(({ token, unsettledReward }) => (
            <TokenItem key={token.address} token={token} amount={unsettledReward} />
          ))}
        </div>
      </div>

      <div className="p-16px flex bg-orange-light-hover flex-col items-start rounded-16px text-black-normal w-full">
        <div className="flex items-start w-full">
          <div className="flex flex-col flex-1 min-w-0">
            <span className="inline-block mb-8px text-14px leading-18px">Expected Reward Per Day</span>
            <span className="inline-block text-32px h-40px leading-40px mb-24px overflow-hidden text-ellipsis whitespace-nowrap">
              {expectedRewardPerDayTotalPrice === undefined ? <Spin /> : expectedRewardPerDayTotalPrice ?? '-'}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-8px w-full">
          {activeRewardsInfo.map(({ token, rewardPerDayDisplay }) => (
            <TokenItem key={token.address} token={token} amount={rewardPerDayDisplay} />
          ))}
        </div>
      </div>
    </>
  );
};

export default UnclaimedRewards;
