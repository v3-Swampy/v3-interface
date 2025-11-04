import { Incentive } from './../../utils/graphql/__generated__/graphql';
import { groupBy, map } from 'lodash-es';
import { UniswapV3Staker } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
import type { IncentiveKeyDetail } from './farmingInfo';
import type { PositionForUI } from './positions';
import type { Pool } from '@service/pairs&pool';
import { getPools } from './allPools';

const mergeStakeRewardsByToken = <
  T extends {
    incentiveKey: IncentiveKeyDetail;
    liquidity: bigint;
    boostedLiquidity: bigint;
    rewardsPerSecondX32: bigint;
    unsettledReward: bigint;
  }
>(
  items: T[],
  getRewardTokenKey: (item: T) => string
) => {
  const groupedByRewardToken = groupBy(items, getRewardTokenKey);

  return map(groupedByRewardToken, (rewardTokenItems) => {
    const mergedStakeReward = rewardTokenItems.reduce(
      (acc, item) => ({
        liquidity: acc.liquidity + item.liquidity,
        boostedLiquidity: acc.boostedLiquidity + item.boostedLiquidity,
        rewardsPerSecondX32: acc.rewardsPerSecondX32 + item.rewardsPerSecondX32,
        unsettledReward: acc.unsettledReward + item.unsettledReward,
      }),
      {
        liquidity: 0n,
        boostedLiquidity: 0n,
        rewardsPerSecondX32: 0n,
        unsettledReward: 0n,
      }
    );

    return {
      stakeReward: mergedStakeReward,
      rewardTokenInfo: rewardTokenItems[0].incentiveKey?.rewardTokenInfo,
    };
  });
};

export const getUserFarmInfoOfPosition = async ({ position, pool }: { position: PositionForUI; pool: Pool }) => {
  if (!position || !pool) return null;
  const pools = await getPools([pool.address]);
  const incentiveKeys = pools?.[0]?.incentiveKeys || [];

  const stakeRewardsQueryMulticall = await fetchChain<string>({
    rpcUrl: import.meta.env.VITE_ESpaceRpcUrl,
    method: 'eth_call',
    params: [
      {
        from: '0x000000000000000000000000000000000000fe01',
        to: UniswapV3Staker.address,
        data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [
          incentiveKeys.map((incentiveKey) => UniswapV3Staker.func.interface.encodeFunctionData('getStakeRewardInfo', [incentiveKey.key, position.tokenId])),
        ]),
      },
      'latest',
    ],
  });

  const stakeRewardsQuery = UniswapV3Staker.func.interface.decodeFunctionResult('multicall', stakeRewardsQueryMulticall)?.[0];
  const stakeRewards = Array.from(stakeRewardsQuery).map((item, index) => {
    const [liquidity, boostedLiquidity, rewardsPerSecondX32, unsettledReward] = UniswapV3Staker.func.interface.decodeFunctionResult(
      'getStakeRewardInfo',
      item as string
    ) as Array<bigint>;
    return {
      incentiveKey: incentiveKeys[index],
      liquidity,
      boostedLiquidity,
      rewardsPerSecondX32,
      unsettledReward,
    };
  });

  const isRewardActive = position.positionStatus === 'InRange' && incentiveKeys.some((item) => item.status === 'active');
  const activeIncentiveKeys = stakeRewards.filter((item) => item.incentiveKey.status === 'active').map((item) => item.incentiveKey);
  const activeRewards = mergeStakeRewardsByToken(
    stakeRewards.filter((item) => item.incentiveKey.status === 'active' && position.positionStatus === 'InRange'),
    (item) => item.incentiveKey.rewardToken.toLowerCase()
  );

  const stakedIncentiveKeys = stakeRewards.filter((item) => item.boostedLiquidity > 0n).map((item) => item.incentiveKey);
  const unsettledRewards = mergeStakeRewardsByToken(
    stakeRewards.filter((item) => item.unsettledReward > 0n),
    (item) => item.incentiveKey.rewardToken.toLowerCase()
  );

  return {
    isRewardActive, // whether the position can earn farming rewards now
    stakedIncentiveKeys, // all incentive keys with staked liquidity
    activeIncentiveKeys, // active incentive keys when position is in range
    activeRewards, // all active incentive keys stake rewards
    unsettledRewards, // all incentive keys unsettled rewards
    allRewards: stakeRewards, // all incentive keys stake rewards
  };
};
