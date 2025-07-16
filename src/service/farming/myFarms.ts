import { selector, useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import { groupBy, map, } from 'lodash-es';
import { UniswapV3Staker } from '@contracts/index';
import { fetchChain } from '@cfx-kit/dapp-utils/dist/fetch';
import { accountState } from '@service/account';
import { TokenVST } from '@service/tokens';
import { poolsQuery } from './farmingList';

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
        Array.from(UniswapV3Staker.func.interface.decodeFunctionResult('getUserPositions', item as string)?.[0] as bigint[])
      );

      const userPositionsWithIncentiveKey = userPositions.map((tokenIds, index) => {
        const pool = pools[index];
        return tokenIds.flatMap((tokenId) =>
          pool.incentiveKeys.map((incentiveKey) => ({
            pool,
            tokenId,
            incentiveKey
          }))
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
              userPositionsWithIncentiveKey.map(({ incentiveKey, tokenId }) =>
                UniswapV3Staker.func.interface.encodeFunctionData('getStakeRewardInfo', [incentiveKey.key, tokenId])
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
      })).filter(item => item.incentiveKey.status !== 'not-active');

      const groupedByPoolAndStatus = groupBy(myFarmsResult, (item) =>
        `${item.pool.poolAddress}_${item.incentiveKey.status}`
      );

      // 根据时间段包含关系进行聚类的函数
      const groupByTimeRange = (items: typeof myFarmsResult) => {
        // 获取所有唯一的时间段
        const timeRanges = Array.from(new Set(items.map(item => 
          `${item.incentiveKey.startTime}_${item.incentiveKey.endTime}`
        ))).map(range => {
          const [startTime, endTime] = range.split('_').map(Number);
          return { startTime, endTime, key: range };
        });

        // 找到每个时间段的包含关系
        const groups: { [key: string]: string[] } = {};
        const processed = new Set<string>();

        // 为每个时间段找到它的根时间段（包含它的最大时间段）
        timeRanges.forEach(range => {
          if (processed.has(range.key)) return;

          // 找到包含当前时间段的所有时间段
          const containingRanges = timeRanges.filter(other => 
            other.startTime <= range.startTime && 
            other.endTime >= range.endTime &&
            other.key !== range.key
          );

          // 找到最大的包含时间段（如果有的话）
          const rootRange = containingRanges.length > 0 
            ? containingRanges.reduce((prev, curr) => 
                (curr.endTime - curr.startTime) > (prev.endTime - prev.startTime) ? curr : prev
              )
            : range;

          // 将当前时间段归到根时间段的组中
          if (!groups[rootRange.key]) {
            groups[rootRange.key] = [];
          }
          groups[rootRange.key].push(range.key);
          processed.add(range.key);
        });

        // 根据分组结果重新组织items
        return Object.values(groups).map(groupKeys => {
          return items.filter(item => 
            groupKeys.includes(`${item.incentiveKey.startTime}_${item.incentiveKey.endTime}`)
          );
        });
      };

      const groupedFarms = Object.values(groupedByPoolAndStatus).flatMap(poolStatusItems => {
        // 首先按时间段包含关系分组
        const timeRangeGroups = groupByTimeRange(poolStatusItems);
        
        return timeRangeGroups.map(items => {
          const groupedByTokenId = groupBy(items, 'tokenId');

          const positions = map(groupedByTokenId, (tokenIdItems, tokenId) => {
            const groupedByRewardToken = groupBy(tokenIdItems, item => item.incentiveKey.rewardToken.toLowerCase());

            const rewards = map(groupedByRewardToken, (rewardTokenItems) => {
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
                rewardTokenInfo: rewardTokenItems[0].incentiveKey.rewardTokenInfo,
              };
            });

            return {
              tokenId: BigInt(tokenId),
              rewards,
            };
          });

          return {
            pool: items[0].pool,
            positions,
            incentiveStatus: items[0].incentiveKey.status,
            VSTIncentiveEndAt: items?.find(item => item.incentiveKey.rewardToken.toLowerCase() === TokenVST.address.toLowerCase())?.incentiveKey.endTime,
          };
        });
      }).flat().sort((a, b) => {
        if (a.incentiveStatus === 'ended' && b.incentiveStatus !== 'ended') {
          return 1;
        }
        if (a.incentiveStatus !== 'ended' && b.incentiveStatus === 'ended') {
          return -1;
        }
        return 0;
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