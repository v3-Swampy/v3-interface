import { Incentive } from './../../utils/graphql/__generated__/graphql';
import { groupBy, map } from 'lodash-es';
import { UniswapV3Staker } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
import type { PositionForUI } from './positions';
import type { Pool } from '@service/pairs&pool';
import { getPools, IncentiveKeyDetail } from './allPools';
import { getUnwrapperTokenByAddress , Token} from '@service/tokens';

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

export interface UnclaimedRewardInfo {
  stakeReward: {
    unsettledReward: bigint;
    settledReward: bigint;
    unclaimedReward: bigint;
  };
  rewardTokenInfo?: Token;
}

const mergeUnclaimedRewardsByToken = <
  T extends {
    token: string;
    unsettledReward: bigint;
    settledReward: bigint;
    unclaimedReward: bigint;
  }
>(
  items: T[],
  getRewardTokenKey: (item: T) => string
) => {
  const groupedByRewardToken = groupBy(items, getRewardTokenKey);

  return map(groupedByRewardToken, (rewardTokenItems) => {
    const mergedUnclaimedReward = rewardTokenItems.reduce(
      (acc, item) => ({
        unsettledReward: acc.unsettledReward + item.unsettledReward,
        settledReward: acc.settledReward + item.settledReward,
        unclaimedReward: acc.unclaimedReward + item.unclaimedReward,
      }),
      {
        unsettledReward: 0n,
        settledReward: 0n,
        unclaimedReward: 0n,
      }
    );

    return {
      stakeReward: mergedUnclaimedReward,
      rewardTokenInfo: getUnwrapperTokenByAddress(rewardTokenItems[0].token) || undefined,
    };
  });
};

export const getUserFarmInfoOfPosition = async ({ position, pool, rewardTokens }: { position: PositionForUI; pool: Pool; rewardTokens: string[] }) => {
  if (!position || !pool) return null;
  const pools = await getPools([pool.address]);
  const incentiveKeys = pools?.[0]?.incentiveKeys || [];

  // 构建调用数据
  const stakeRewardCalls = incentiveKeys.map((incentiveKey) => UniswapV3Staker.func.interface.encodeFunctionData('getStakeRewardInfo', [incentiveKey.key, position.tokenId]));

  const settledRewardCalls = rewardTokens.map((token: string) => UniswapV3Staker.func.interface.encodeFunctionData('rewards', [position.tokenId, token]));

  const allCalls = [...stakeRewardCalls, ...settledRewardCalls];

  const combinedMulticall = await fetchChain<string>({
    rpcUrl: import.meta.env.VITE_ESpaceRpcUrl,
    method: 'eth_call',
    params: [
      {
        from: '0x000000000000000000000000000000000000fe01',
        to: UniswapV3Staker.address,
        data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [allCalls]),
      },
      'latest',
    ],
  });

  const combinedResults = UniswapV3Staker.func.interface.decodeFunctionResult('multicall', combinedMulticall)?.[0];

  // 分离结果
  const stakeRewardsResults = Array.from(combinedResults).slice(0, incentiveKeys.length);
  const settleRewardsResults = Array.from(combinedResults).slice(incentiveKeys.length);

  const stakeRewards = stakeRewardsResults.map((item, index) => {
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

  // 处理 settle rewards 结果（如果需要的话）
  const settleRewards = settleRewardsResults.map((item, index) => {
    const result = UniswapV3Staker.func.interface.decodeFunctionResult('rewards', item as string);
    return {
      token: rewardTokens[index],
      amount: result[0] as bigint,
    };
  });

  // 合并 stakeRewards 和 settleRewards
  const rewardTokenMap = new Map<string, any>();

  // 先添加 stakeRewards
  stakeRewards.forEach((stakeReward) => {
    const rewardToken = stakeReward.incentiveKey.rewardToken.toLowerCase();
    rewardTokenMap.set(rewardToken, {
      token: rewardToken,
      unsettledReward: stakeReward.unsettledReward,
      settledReward: 0n, // 初始化为0
    });
  });

  // 再添加 settleRewards，如果token存在则相加，如果不存在则创建新的
  settleRewards.forEach((settleReward) => {
    const rewardToken = settleReward.token.toLowerCase();
    const existing = rewardTokenMap.get(rewardToken);

    if (existing) {
      // token 已存在，添加 settled reward
      existing.settledReward = settleReward.amount;
    } else {
      // token 不存在于 stakeRewards 中，创建新的条目
      rewardTokenMap.set(rewardToken, {
        token: rewardToken,
        unsettledReward: 0n,
        settledReward: settleReward.amount,
      });
    }
  });

  // 转换为数组并计算总的 unclaimed rewards
  const _unclaimedRewards = Array.from(rewardTokenMap.values()).map((item) => ({
    ...item,
    unclaimedReward: item.unsettledReward + item.settledReward, // 总的未提取奖励
  }));


  const isRewardActive = position.positionStatus === 'InRange' && incentiveKeys.some((item) => item.status === 'active');
  const activeIncentiveKeys = stakeRewards.filter((item) => item.incentiveKey.status === 'active').map((item) => item.incentiveKey);
  const activeRewards = mergeStakeRewardsByToken(
    stakeRewards.filter((item) => item.incentiveKey.status === 'active' && position.positionStatus === 'InRange'),
    (item) => item.incentiveKey.rewardToken.toLowerCase()
  );

  const unclaimedRewards = mergeUnclaimedRewardsByToken(
    _unclaimedRewards.filter((item) => item.unclaimedReward > 0n),
    (item) => item.token.toLowerCase()
  );

  return {
    isRewardActive, // whether the position can earn farming rewards now
    activeIncentiveKeys, // active incentive keys when position is in range
    activeRewards, // all active incentive keys stake rewards
    unclaimedRewards, // all incentive keys unclaimed rewards
    allRewards: stakeRewards, // all incentive keys stake rewards
  };
};
