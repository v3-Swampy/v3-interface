import { selector, useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import { groupBy, map, } from 'lodash-es';
import { UniswapV3Staker } from '@contracts/index';
import { fetchChain } from '@cfx-kit/dapp-utils/dist/fetch';
import { accountState } from '@service/account';
import { type Token, TokenVST, isTokenEqual } from '@service/tokens';
import { positionsQueryByTokenIds } from '@service/position';
import { poolsQuery, type IncentiveKeyDetail } from './farmingList';

const mergeStakeRewardsByToken = <T extends {
  stakeReward: {
    liquidity: bigint;
    boostedLiquidity: bigint;
    rewardsPerSecondX32: bigint;
    unsettledReward: bigint;
  }; rewardTokenInfo?: Token; incentiveKey?: IncentiveKeyDetail
}>(
  items: T[],
  getRewardTokenKey: (item: T) => string
) => {
  const groupedByRewardToken = groupBy(items, getRewardTokenKey);

  return map(groupedByRewardToken, (rewardTokenItems) => {
    const mergedStakeReward = rewardTokenItems.reduce((acc, item) => ({
      liquidity: acc.liquidity + item.stakeReward.liquidity,
      boostedLiquidity: acc.boostedLiquidity + item.stakeReward.boostedLiquidity,
      rewardsPerSecondX32: acc.rewardsPerSecondX32 + item.stakeReward.rewardsPerSecondX32,
      unsettledReward: acc.unsettledReward + item.stakeReward.unsettledReward,
    }), {
      liquidity: 0n,
      boostedLiquidity: 0n,
      rewardsPerSecondX32: 0n,
      unsettledReward: 0n,
    });

    return {
      stakeReward: mergedStakeReward,
      rewardTokenInfo: rewardTokenItems[0].rewardTokenInfo || rewardTokenItems[0].incentiveKey?.rewardTokenInfo,
    };
  });
};


export type Rewards = ReturnType<typeof mergeStakeRewardsByToken>;

const myFarmsQuery = selector({
  key: `myFarmsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    try {
      const account = get(accountState);
      if (!account) return null;

      const pools = get(poolsQuery);
      if (!pools) return null;

      const userPositionsQueryMulticall = await fetchChain<string>({
        url: 'https://evmtestnet.confluxrpc.com',
        method: 'eth_call',
        params: [
          {
            from: '0x000000000000000000000000000000000000fe01',
            to: UniswapV3Staker.address,
            data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [
              pools.map(({ poolAddress }) =>
                UniswapV3Staker.func.interface.encodeFunctionData('getUserPositions', [account, poolAddress])
              )
            ])
          },
          'latest'
        ]
      });

      const userPositionsQuery = UniswapV3Staker.func.interface.decodeFunctionResult('multicall', userPositionsQueryMulticall)?.[0];
      const userPositions = Array.from(userPositionsQuery).map((item) =>
        Array.from(UniswapV3Staker.func.interface.decodeFunctionResult('getUserPositions', item as string)?.[0] as bigint[]).map(bigintValue => Number(bigintValue))
      );

      const positions = get(positionsQueryByTokenIds(userPositions.flat()));

      const userPositionsWithIncentiveKey = userPositions.map((tokenIds, index) => {
        const pool = pools[index];
        return tokenIds.flatMap((tokenId) =>
          pool.incentiveKeys.map((incentiveKey) =>
          ({
            pool,
            position: positions.find(position => position.id === tokenId)!,
            incentiveKey
          })
          )
        );
      }).flat();

      const stakeRewardsQueryMulticall = await fetchChain<string>({
        url: 'https://evmtestnet.confluxrpc.com',
        method: 'eth_call',
        params: [
          {
            from: '0x000000000000000000000000000000000000fe01',
            to: UniswapV3Staker.address,
            data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [
              userPositionsWithIncentiveKey.map(({ incentiveKey, position }) =>
                UniswapV3Staker.func.interface.encodeFunctionData('getStakeRewardInfo', [incentiveKey.key, position.id])
              )
            ])
          },
          'latest'
        ]
      });

      const stakeRewardsQuery = UniswapV3Staker.func.interface.decodeFunctionResult('multicall', stakeRewardsQueryMulticall)?.[0];

      const stakeRewards = Array.from(stakeRewardsQuery).map((item) => {
        const [liquidity, boostedLiquidity, rewardsPerSecondX32, unsettledReward] = UniswapV3Staker.func.interface.decodeFunctionResult('getStakeRewardInfo', item as string) as Array<bigint>;
        return {
          liquidity,
          boostedLiquidity,
          rewardsPerSecondX32,
          unsettledReward,
        };
      });

      const myFarmsResult = userPositionsWithIncentiveKey.map((userPositionWithIncentiveKey, index) => ({
        ...userPositionWithIncentiveKey,
        stakeReward: stakeRewards[index],
      }));

      const groupedByPool = groupBy(myFarmsResult, item => item.pool.poolAddress);

      const groupedFarms = map(groupedByPool, (items) => {
        const groupedByTokenId = groupBy(items, item => item.position.id);
        const VSTIncentiveKey = items.find((item) => item.incentiveKey.status === 'active' && isTokenEqual(item.incentiveKey.rewardTokenInfo, TokenVST))?.incentiveKey;

        const positions = map(groupedByTokenId, (incentiveItems, positionId) => {
          const activeRewards = mergeStakeRewardsByToken(
            incentiveItems.filter((item) => item.incentiveKey.status === 'active' && item.position.positionStatus === 'InRange'),
            item => item.incentiveKey.rewardToken.toLowerCase()
          );

          const rewards = mergeStakeRewardsByToken(
            incentiveItems,
            item => item.incentiveKey.rewardToken.toLowerCase()
          );

          return {
            tokenId: Number(positionId),
            position: incentiveItems[0].position,
            isPositionActive: incentiveItems[0].position.positionStatus === 'InRange' && !!VSTIncentiveKey,
            VSTIncentiveKey,
            activeRewards,
            rewards,
          };
        });

        return {
          pool: items[0].pool,
          positions,
          rewards: mergeStakeRewardsByToken(
            positions.flatMap(pos => pos.rewards),
            reward => reward.rewardTokenInfo?.address?.toLowerCase() ?? ''
          ),
          activeRewards: mergeStakeRewardsByToken(
            positions.flatMap(pos => pos.activeRewards),
            reward => reward.rewardTokenInfo?.address?.toLowerCase() ?? ''
          ),
        };
      });
      return groupedFarms;
    } catch (error) {
      console.error('Error in myFarmsQuery:', error);
      return null;
    }
  },
});

export const useMyFarms = () => useRecoilValue(myFarmsQuery);
export const useRefreshMyFarms = () => useRecoilRefresher_UNSTABLE(myFarmsQuery);
