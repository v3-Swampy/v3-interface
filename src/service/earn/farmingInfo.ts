import { fetchMulticall, UniswapV3Staker } from '@contracts/index';
import { getTokenByAddressWithAutoFetch, type Token } from '@service/tokens';
import { getTimestamp } from '@service/earn/timestamp';

export interface IncentiveKey {
  rewardToken: string;
  poolAddress: string;
  startTime: number;
  endTime: number;
  refundee: string;
}

export interface IncentiveKeyDetail extends IncentiveKey {
  status: 'not-active' | 'active' | 'ended';
  key: [string, string, number, number, string];
  rewardTokenInfo: Token;
}


export const getFarmingInfoOfPool = async (poolAddress: string) => {
  const timestamp = await getTimestamp();
  const incentiveKeysQuery = await fetchMulticall([
    [UniswapV3Staker.address, UniswapV3Staker.func.interface.encodeFunctionData('getAllIncentiveKeysByPool', [poolAddress])],
  ]);

  const incentiveKeys: IncentiveKeyDetail[] = incentiveKeysQuery?.[0]
    ? await Promise.all(
        (UniswapV3Staker.func.interface.decodeFunctionResult('getAllIncentiveKeysByPool', incentiveKeysQuery[0])?.[0] ?? []).map(async (data: Array<any>) => ({
          rewardToken: data?.[0],
          poolAddress: data?.[1],
          startTime: Number(data?.[2]),
          endTime: Number(data?.[3]),
          refundee: data?.[4],
          status: Number(data?.[2]) <= timestamp && Number(data?.[3]) >= timestamp ? 'active' : Number(data?.[2]) > timestamp ? 'not-active' : 'ended',
          key: [data?.[0], data?.[1], data?.[2], data?.[3], data?.[4]],
          rewardTokenInfo: await getTokenByAddressWithAutoFetch(data?.[0])!,
        }))
      )
    : [];

  const incentivesQuery = await fetchMulticall(
    incentiveKeys.map((key: IncentiveKeyDetail) => [
      UniswapV3Staker.address,
      UniswapV3Staker.func.interface.encodeFunctionData('getIncentiveRewardInfo', [[key.rewardToken, key.poolAddress, key.startTime, key.endTime, key.refundee]]),
    ])
  );

  const incentives =
    incentivesQuery?.map((raw) => {
      const [token0Amount, token1Amount, tokenUnreleased, rewardRate, isEmpty] = UniswapV3Staker.func.interface.decodeFunctionResult(
        'getIncentiveRewardInfo',
        raw
      ) as unknown as [bigint, bigint, bigint, bigint, boolean];
      return { token0Amount, token1Amount, tokenUnreleased, rewardRate, isEmpty };
    }) ?? [];

  const rewardTokenAddresses = incentiveKeys.filter((key: IncentiveKeyDetail) => key.status === 'active').map((key: IncentiveKeyDetail) => key.rewardToken);
  const rewards = await Promise.all(
    [...new Set(rewardTokenAddresses)].map(async (address) => ({
      token: await getTokenByAddressWithAutoFetch(address),
    }))
  );
  if (!Array.isArray(incentiveKeys) || !incentiveKeys.length) return null;

  return {
    incentiveKeys,
    incentives,
    rewards,
  };
};
