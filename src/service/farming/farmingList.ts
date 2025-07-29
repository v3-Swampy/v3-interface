import { atom, selector, useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import { fetchMulticall, createPairContract, UniswapV3Staker } from '@contracts/index';
import { getTokenByAddressWithAutoFetch, getTokenByAddress, getUnwrapperTokenByAddress, stableTokens, baseTokens, TokenVST, type Token } from '@service/tokens';
import { chunk } from 'lodash-es';
import { timestampSelector } from './timestamp';
import { customBlockNumber } from '@utils/customBlockNumber';

export const farmingPoolsAddress = atom<Array<string>>({
  key: `farmingPoolsAddress-${import.meta.env.MODE}`,
  default: [
    '0x3EEd2D9BA0Ea2c4AcBA87206F69cDcB4d3a03f31',
    '0xc0D0e6fDB000b62E48db5CCD54A1CFE3c5CB30Ea',
    '0x4A33468caAFD9220AB0b11e3342bE8AAcC468908',
    '0xB7CC615ffcE028f541705B796EDff62f2d28BBa4',
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
      ,
      customBlockNumber
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
      poolsAddress.map((address) => [UniswapV3Staker.address, UniswapV3Staker.func.interface.encodeFunctionData('getAllIncentiveKeysByPool', [address])]),
      customBlockNumber
    );
    const incentiveKeys = incentiveKeysQuery?.map((res) => {
      const decodeResult = UniswapV3Staker.func.interface.decodeFunctionResult('getAllIncentiveKeysByPool', res);
      return decodeResult?.[0]?.map((data: Array<any>) => ({
        rewardToken: data?.[0],
        poolAddress: data?.[1],
        startTime: Number(data?.[2]),
        endTime: Number(data?.[3]),
        refundee: data?.[4],
        status: Number(data?.[2]) <= timestamp && Number(data?.[3]) >= timestamp ? 'active' : Number(data?.[2]) > timestamp ? 'not-active' : 'ended',
        key: [data?.[0], data?.[1], data?.[2], data?.[3], data?.[4]],
        rewardTokenInfo: getTokenByAddress(data?.[0])!,
      })) as Array<IncentiveKeyDetail>
    })!;

    const incentivesQuery = await fetchMulticall(
      incentiveKeys
        .flat()
        .map((key) => [
          UniswapV3Staker.address,
          UniswapV3Staker.func.interface.encodeFunctionData('getIncentiveRewardInfo', [[key.rewardToken, key.poolAddress, key.startTime, key.endTime, key.refundee]]),
        ]),
        customBlockNumber
    );

    const incentives = chunk(incentivesQuery, ...incentiveKeys.map((keys) => keys.length)).map((group) =>
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
            const rewardTokenAddresses = incentiveKeys[index].filter(key => key.status === 'active').map((key) => key.rewardToken);
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
