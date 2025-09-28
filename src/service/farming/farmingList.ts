import { atom, selector, useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import { fetchMulticall, createPairContract, UniswapV3Staker } from '@contracts/index';
import { getTokenByAddressWithAutoFetch, getUnwrapperTokenByAddress, stableTokens, baseTokens, type Token } from '@service/tokens';
import { chunk } from 'lodash-es';
import { isProduction } from '@utils/is';
import { timestampSelector } from './timestamp';

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

export const farmingPoolsAddress = atom<Array<string>>({
  key: `farmingPoolsAddress-${import.meta.env.MODE}`,
  default: isProduction
    ? ['0x6857285eb6b3feb1d007a57b1DFDD76B2fAb0D0a', '0x6806c2808b68b74206A0Cbe00dDe2d0e26216308', '0x108920614FD13CeaAf52026E76D18C480e88AA2A']
    : [
        '0x5D3c14F19776d197642Db3f7dde9cb38f7AD1a0A',
        '0x185A696a1Da0e300CBbdd1c3f1f35448c779680C',
        '0x04989512a2f29BC1D133A03c69cA3dDe3313c478',
        '0x48CA85EC0ca84B63925E1bcE68e6796055af289f',
      ],
});

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

export const poolsQuery = selector({
  key: `farmingPoolsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const poolsAddress = get(farmingPoolsAddress);
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
            fee: pairContracts[i].func.interface.decodeFunctionResult('fee', r[2])[0].toString(),
          };
        })
      : [];

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

    const timestamp = get(timestampSelector);
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
            const rewardTokenAddresses = incentiveKeys[index].filter((key: IncentiveKeyDetail) => key.status === 'active').map((key: IncentiveKeyDetail) => key.rewardToken);
            const rewards = await Promise.all(
              [...new Set(rewardTokenAddresses)].map(async (address) => ({
                token: await getTokenByAddressWithAutoFetch(address),
              }))
            );

            return {
              poolAddress,
              pairInfo: {
                fee: pairsInfo[index].fee,
                token0: tokensDetail[index].token0,
                token1: tokensDetail[index].token1,
                leftToken: leftAndRightTokens[index].leftToken,
                rightToken: leftAndRightTokens[index].rightToken,
              },
              incentiveKeys: incentiveKeys?.[index] ?? [],
              incentives: incentives?.[index] ?? [],
              rewards,
            };
          })
        )
      : null;

    return pools;
  },
});

export const usePools = () => {
  return useRecoilValue(poolsQuery);
};

export const useRefreshPoolsQuery = () => useRecoilRefresher_UNSTABLE(poolsQuery);

const getLRToken = (token0: Token | null, token1: Token | null) => {
  if (!token0 || !token1) return [];
  const unwrapToken0 = getUnwrapperTokenByAddress(token0.address);
  const unwrapToken1 = getUnwrapperTokenByAddress(token1.address);
  const checkedLR =
    // if token0 is a dollar-stable asset, set it as the quote token
    stableTokens.some((stableToken) => stableToken?.address === token0.address) ||
    // if token1 is an ETH-/BTC-stable asset, set it as the base token
    baseTokens.some((baseToken) => baseToken?.address === token1.address);
  const leftToken = checkedLR ? unwrapToken0 : unwrapToken1;
  const rightToken = checkedLR ? unwrapToken1 : unwrapToken0;
  return [leftToken, rightToken];
};
