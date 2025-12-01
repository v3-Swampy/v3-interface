import { useRecoilValue, useRecoilRefresher_UNSTABLE, selectorFamily } from 'recoil';
import { fetchMulticall, createPairContract, UniswapV3Staker, createERC20Contract } from '@contracts/index';
import { getTokenByAddressWithAutoFetch, getUnwrapperTokenByAddress, type Token } from '@service/tokens';
import { chunk } from 'lodash-es';
import { getTokenPriority } from '@service/earn/positions';
import { getPoolsWith24HoursData } from './apis';
import { getTimestamp } from './timestamp';
import { getRecoil } from 'recoil-nexus';
import { getTokensPrice } from '@service/pairs&pool';
import Decimal from 'decimal.js';

/**
 * 将数组按照指定的长度数组分组
 * @param array 要分组的数组
 * @param lengths 每个分组的长度数组
 * @returns 分组后的数组
 */
function chunkByLengths<T>(array: T[] | null | undefined, lengths: number[]): T[][] {
  if (!array || !lengths.length) return [];
  const result: T[][] = [];
  let currentIndex = 0;

  for (const length of lengths) {
    if (currentIndex >= array.length) break;
    result.push(array.slice(currentIndex, currentIndex + length));
    currentIndex += length;
  }

  return result;
}

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

export const poolsWith24HoursData = selectorFamily({
  key: `poolsWith24HoursData-${import.meta.env.MODE}`,
  get:
    (poolIdParams?: string[]) =>
    async ({ get }) => {
      let poolIds: string[] | undefined = undefined;
      if (poolIdParams && poolIdParams.length > 0) {
        poolIds = poolIdParams.map((poolId) => poolId.toLowerCase());
      }

      const res = await getPoolsWith24HoursData(poolIds);

      return res;
    },
});

export const poolsQuery = selectorFamily({
  key: `earn-poolsQuery-${import.meta.env.MODE}`,
  get:
    (queryPoolsAddress: string[] | undefined) =>
    async ({ get }) => {
      const pool24HourData = get(poolsWith24HoursData(queryPoolsAddress));
      const poolsAddress = pool24HourData.map((p) => p.id);
      const pairContracts = poolsAddress.map((poolAddress) => createPairContract(poolAddress));
      const pairsInfoQuery = await fetchMulticall(
        pairContracts
          .map((pairContract) => {
            return [
              [pairContract.address, pairContract.func.interface.encodeFunctionData('token0')],
              [pairContract.address, pairContract.func.interface.encodeFunctionData('token1')],
              [pairContract.address, pairContract.func.interface.encodeFunctionData('fee')],
            ];
          })
          .flat()
      );
      const pairsInfo = pairsInfoQuery
        ? chunk(pairsInfoQuery, 3).map((r, i) => {
            return {
              token0Address: pairContracts[i].func.interface.decodeFunctionResult('token0', r[0])[0],
              token1Address: pairContracts[i].func.interface.decodeFunctionResult('token1', r[1])[0],
              fee: Number(pairContracts[i].func.interface.decodeFunctionResult('fee', r[2])[0].toString()),
            };
          })
        : [];

      // use Set to remove duplicate tokens
      const tokens = pairsInfo.reduce((acc, cur) => {
        acc.add(cur.token0Address);
        acc.add(cur.token1Address);
        return acc;
      }, new Set<string>());
      // fetch tokens price
      const tokenPriceMap = await getTokensPrice(Array.from(tokens));

      const tokensDetail = await Promise.all(
        pairsInfo.map(async (info) => {
          const [token0, token1] = await Promise.all([getTokenByAddressWithAutoFetch(info.token0Address), getTokenByAddressWithAutoFetch(info.token1Address)]);
          return {
            token0,
            token1,
          };
        })
      );

      const leftAndRightTokens = tokensDetail.map((token) => {
        const [leftToken, rightToken] = getLRToken(token.token0, token.token1);
        return {
          leftToken,
          rightToken,
        };
      });

      const timestamp = await getTimestamp();
      const incentiveKeysQuery = await fetchMulticall(
        poolsAddress.map((address) => [UniswapV3Staker.address, UniswapV3Staker.func.interface.encodeFunctionData('getAllIncentiveKeysByPool', [address])])
      );
      const incentiveKeys = (await Promise.all(
        (incentiveKeysQuery ?? []).map(async (res) => {
          const decodeResult = UniswapV3Staker.func.interface.decodeFunctionResult('getAllIncentiveKeysByPool', res);
          const results = await Promise.all(
            (decodeResult?.[0] ?? []).map(async (data: Array<any>) => ({
              rewardToken: data?.[0],
              poolAddress: data?.[1],
              startTime: Number(data?.[2]),
              endTime: Number(data?.[3]),
              refundee: data?.[4],
              status: Number(data?.[2]) <= timestamp && Number(data?.[3]) >= timestamp ? 'active' : Number(data?.[2]) > timestamp ? 'not-active' : 'ended',
              key: [data?.[0], data?.[1], data?.[2], data?.[3], data?.[4]],
              rewardTokenInfo: await getTokenByAddressWithAutoFetch(data?.[0])!,
            }))
          );
          return results;
        })
      )) as Array<Array<IncentiveKeyDetail>>;

      const incentivesQuery = await fetchMulticall(
        incentiveKeys
          .flat()
          .map((key: IncentiveKeyDetail) => [
            UniswapV3Staker.address,
            UniswapV3Staker.func.interface.encodeFunctionData('getIncentiveRewardInfo', [[key.rewardToken, key.poolAddress, key.startTime, key.endTime, key.refundee]]),
          ])
      );
      // 使用自定义的 chunkByLengths 函数按照每个 pool 的 incentiveKey 数量来分组
      const incentives = chunkByLengths(
        incentivesQuery,
        incentiveKeys.map((keys) => keys.length)
      ).map((group) =>
        group.map((raw) => {
          const [token0Amount, token1Amount, tokenUnreleased, rewardRate, isEmpty] = UniswapV3Staker.func.interface.decodeFunctionResult(
            'getIncentiveRewardInfo',
            raw
          ) as unknown as [bigint, bigint, bigint, bigint, boolean];
          return { token0Amount, token1Amount, tokenUnreleased, rewardRate, isEmpty };
        })
      );

      const pools = poolsAddress
        ? await Promise.all(
            poolsAddress.map(async (poolAddress, index) => {
              const poolHourData = pool24HourData[index].poolHourData ?? [];
              const volume24h = poolHourData.reduce((acc, cur) => acc.add(cur.volumeUSD), new Decimal(0));
              const rewardTokenAddresses = incentiveKeys[index].filter((key: IncentiveKeyDetail) => key.status === 'active').map((key: IncentiveKeyDetail) => key.rewardToken);
              const rewards = await Promise.all(
                [...new Set(rewardTokenAddresses)].map(async (address) => ({
                  token: await getTokenByAddressWithAutoFetch(address),
                }))
              );
              const { token0Address, token1Address, fee } = pairsInfo[index];
              const token0Price = tokenPriceMap[token0Address];
              const token1Price = tokenPriceMap[token1Address];
              const token0Contract = createERC20Contract(token0Address);
              const token1Contract = createERC20Contract(token1Address);
              const [amount0Result, amount1Result] =
                (await fetchMulticall([
                  [token0Contract.address, token0Contract.func.interface.encodeFunctionData('balanceOf', [poolAddress])],
                  [token1Contract.address, token1Contract.func.interface.encodeFunctionData('balanceOf', [poolAddress])],
                ])) ?? [];
              const token0Amount: bigint = amount0Result ? token0Contract.func.interface.decodeFunctionResult('balanceOf', amount0Result)?.[0] ?? 0n : 0n;
              const token1Amount: bigint = amount1Result ? token1Contract.func.interface.decodeFunctionResult('balanceOf', amount1Result)?.[0] ?? 0n : 0n;
              // TVL = Reserve_token0 × Price_token0 + Reserve_token1 × Price_token1
              const tvl = new Decimal(token0Amount.toString())
                .div(Decimal.pow(10, tokensDetail[index].token0?.decimals ?? 0))
                .mul(token0Price ?? 0)
                .add(new Decimal(token1Amount.toString()).div(Decimal.pow(10, tokensDetail[index].token1?.decimals ?? 0)).mul(token1Price ?? 0));

              return {
                poolAddress,
                volume24h,
                pairInfo: {
                  fee: fee,
                  token0: tokensDetail[index].token0,
                  token1: tokensDetail[index].token1,
                  leftToken: leftAndRightTokens[index].leftToken,
                  rightToken: leftAndRightTokens[index].rightToken,
                },
                incentiveKeys: incentiveKeys?.[index] ?? [],
                incentives: incentives?.[index] ?? [],
                rewards,
                token0Amount,
                token1Amount,
                tvl,
              };
            })
          )
        : null;

      // hide pool with no tvl, then sort by tvl
      return pools?.filter((i) => !i.tvl.equals(0)).sort((a, b) => (a.tvl.greaterThan(b.tvl) ? -1 : 1));
    },
});

export const usePools = (queryPoolsAddress?: string[]) => useRecoilValue(poolsQuery(queryPoolsAddress));
export const getPools = (queryPoolsAddress?: string[]) => getRecoil(poolsQuery(queryPoolsAddress));

export const useRefreshPoolsQuery = (queryPoolsAddress?: string[]) => useRecoilRefresher_UNSTABLE(poolsQuery(queryPoolsAddress));

const getLRToken = (token0: Token | null, token1: Token | null) => {
  if (!token0 || !token1) return [];
  const unwrapToken0 = getUnwrapperTokenByAddress(token0.address);
  const unwrapToken1 = getUnwrapperTokenByAddress(token1.address);
  const token0Priority = getTokenPriority(token0);
  const token1Priority = getTokenPriority(token1);

  if (token0Priority < token1Priority) return [unwrapToken1, unwrapToken0];

  if (token0Priority > token1Priority) return [unwrapToken0, unwrapToken1];

  return [unwrapToken0, unwrapToken1];
};
