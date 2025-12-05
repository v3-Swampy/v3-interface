import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Decimal from 'decimal.js';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Spin from '@components/Spin';
import Tooltip from '@components/Tooltip';
import useI18n from '@hooks/useI18n';
import { usePosition } from '@service/earn';
import { getUnwrapperTokenByAddress } from '@service/tokens';
import { getTokensPrice } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import { formatDisplayAmount } from '@utils/numberUtils';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';

const transitions = {
  en: {
    expect_rewards: 'Expected Farming Rewards Per Day',
  },
  zh: {
    expect_rewards: '预期每日奖励',
  },
} as const;

const TokenItem: React.FC<{ token: Token | null | undefined; amount: string }> = ({ token, amount }) => {
  return (
    <div className="flex items-center gap-8px text-14px leading-18px font-medium text-black-normal whitespace-nowrap">
      <span>{amount}</span>
      <img className="w-24px h-24px" src={token?.logoURI} alt={`${token?.logoURI} icon`} />
      <span>{token?.symbol}</span>
    </div>
  );
};

const ExpectedRewards: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const position = usePosition(Number(tokenId));

  const activeRewardsInfo = useMemo(
    () =>
      position?.activeRewards?.map((reward) => {
        const rewardPerSecond = new Decimal(reward.stakeReward.rewardsPerSecondX32.toString()).div(Math.pow(2, 32));
        const rewardPerDay = new Unit(rewardPerSecond).mul(86400);
        return {
          token: getUnwrapperTokenByAddress(reward.rewardTokenInfo.address) ?? reward.rewardTokenInfo,
          rewardPerDay: rewardPerDay,
          rewardPerDayDisplay: formatDisplayAmount(rewardPerDay, {
            decimals: reward.rewardTokenInfo.decimals,
            minNum: '0.000001',
            toFixed: 6,
          }),
        };
      }) ?? [],
    [position?.activeRewards]
  );

  const [expectedRewardPerDayTotalPrice, setExpectedRewardPerDayTotalPrice] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!activeRewardsInfo?.length) return;
    getTokensPrice(activeRewardsInfo.map((reward) => reward.token.address)).then((prices) => {
      const _expectedRewardPerDayTotalPrice =
        activeRewardsInfo?.reduce((acc, reward) => {
          const price = prices[reward.token.address];
          if (!price) return acc;
          return acc.add(new Unit(price).mul(reward.rewardPerDay).toDecimalStandardUnit(undefined, reward.token.decimals));
        }, new Unit(0)) ?? new Unit(0);
      setExpectedRewardPerDayTotalPrice(formatDisplayAmount(_expectedRewardPerDayTotalPrice, { decimals: 0, minNum: '0.01', toFixed: 2, unit: '$' }));
    });
  }, [activeRewardsInfo]);

  if (!position || !position.activeRewards?.length) return null;
  return (
    <div className="mt-16px p-16px flex bg-orange-light-hover flex-col items-start rounded-16px text-black-normal w-full">
      <div className="flex items-start w-full">
        <div className="flex flex-col flex-1 min-w-0">
          <span className="inline-block mb-8px text-14px leading-18px">
            {i18n.expect_rewards}
            <Tooltip text="Estimated rewards distributed to you in this pool per day. Rewards are only earned when your position is in range.">
              <span className="w-12px h-12px ml-6px">
                <InfoIcon className="w-12px h-12px translate-y-1.5px" />
              </span>
            </Tooltip>
          </span>
          <span className="inline-block text-32px h-40px leading-40px mb-24px overflow-hidden text-ellipsis whitespace-nowrap">
            {expectedRewardPerDayTotalPrice ?? '-'}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-8px">
        {activeRewardsInfo.map(({ token, rewardPerDayDisplay }, index) => (
          <React.Fragment key={token.address}>
            {index > 0 && <span className="text-14px leading-24px font-medium text-black-normal">+</span>}
            <TokenItem token={token} amount={rewardPerDayDisplay} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ExpectedRewards;
