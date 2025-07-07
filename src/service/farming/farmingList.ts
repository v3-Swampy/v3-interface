import { atom, selector, useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import { fetchMulticall, createPairContract, UniswapV3Staker } from '@contracts/index';
import { getTokenByAddress, getUnwrapperTokenByAddress, stableTokens, baseTokens, type Token } from '@service/tokens';
import { chunk } from 'lodash-es';
import { timestampSelector } from './timestamp';


export const farmingPoolsAddress = atom<Array<string>>({
  key: `farmingPoolsAddress-${import.meta.env.MODE}`,
  default: [
    "0x3EEd2D9BA0Ea2c4AcBA87206F69cDcB4d3a03f31",
    "0xc0D0e6fDB000b62E48db5CCD54A1CFE3c5CB30Ea",
  ]
});

export interface incentiveKey {
  rewardToken: string;
  poolAddress: string;
  startTime: number;
  endTime: number;
  refundee: string;
}

const poolsQuery = selector({
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
    const tokensDetail = await Promise.all(pairsInfo.map(async (info) => {
      const token0 = await getTokenByAddress(info.token0Address)!;
      const token1 = await getTokenByAddress(info.token1Address)!;
      return {
        token0,
        token1,
      };
    }));
    const leftAndRightTokens = tokensDetail.map((token) => {
      const [leftToken, rightToken] = getLRToken(token.token0, token.token1);
      return {
        leftToken,
        rightToken,
      };
    });

    const timestamp = get(timestampSelector);
    const incentiveKeysQuery = await fetchMulticall(poolsAddress.map((address) => [UniswapV3Staker.address, UniswapV3Staker.func.interface.encodeFunctionData('getAllIncentiveKeysByPool', [address])]));
    const incentiveKeys = incentiveKeysQuery?.map((res) => {
      const decodeResult = UniswapV3Staker.func.interface.decodeFunctionResult('getAllIncentiveKeysByPool', res);
      return decodeResult?.[0]?.map((data: Array<any>) => ({
        rewardToken: data?.[0],
        poolAddress: data?.[1],
        startTime: Number(data?.[2]),
        endTime: Number(data?.[3]),
        refundee: data?.[4],
        inTimeRange: Number(data?.[2]) <= timestamp && Number(data?.[3]) >= timestamp,
      })) as Array<incentiveKey & { inTimeRange: boolean }>
    })!;
    const incentivesQuery = await fetchMulticall(
      incentiveKeys.flat().map((key) => [
        UniswapV3Staker.address,
        UniswapV3Staker.func.interface.encodeFunctionData(
          'getIncentiveRewardInfo',
          [[key.rewardToken, key.poolAddress, key.startTime, key.endTime, key.refundee]]
        )
      ])
    );
    const incentives = chunk(
      incentivesQuery,
      ...incentiveKeys.map(keys => keys.length)
    ).map((group) =>
      group.map((raw) => {
        const [token0Amount, token1Amount, tokenUnreleased, rewardRate, isEmpty] =
          UniswapV3Staker.func.interface.decodeFunctionResult('getIncentiveRewardInfo', raw) as unknown as [bigint, bigint, bigint, bigint, boolean];
        return { token0Amount, token1Amount, tokenUnreleased, rewardRate, isEmpty };
      })
    );

    const pools = poolsAddress?.map((poolAddress, index) => {
      const rewardTokenAddresses = incentiveKeys[index].map(key => key.rewardToken);
      const rewards = [...new Set(rewardTokenAddresses)].map((address) => ({
        token: getTokenByAddress(address)!,
        unreleasedAmount: incentiveKeys[index]
          .map((key, i) => key.rewardToken === address ? incentives[index][i]?.tokenUnreleased : 0n)
          .reduce((a, b) => a + b, 0n),
      }));

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
        currentIncentiveKey: incentiveKeys?.[index]?.find(key => key.inTimeRange),
        rewards,
      };
    }) ?? null;

    return pools;
  }
});

export const usePools = () => {
  return useRecoilValue(poolsQuery);
};

export const useRefreshPoolsQuery = () => useRecoilRefresher_UNSTABLE(poolsQuery);


const currentIncentiveKeySelector = selector({
  key: `currentIncentiveKeySelector-${import.meta.env.MODE}`,
  get: ({ get }) => {
    const pools = get(poolsQuery);
    return pools?.[0]?.incentiveKeys.find(key => key.inTimeRange);
  }
});

export const useCurrentIncentiveKey = () => {
  return useRecoilValue(currentIncentiveKeySelector);
};


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