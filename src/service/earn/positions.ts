import { useMemo } from 'react';
import { selector, useRecoilValue, useRecoilValue_TRANSITION_SUPPORT_UNSTABLE, useRecoilRefresher_UNSTABLE, selectorFamily } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { NonfungiblePositionManager, fetchMulticall } from '@contracts/index';
import { accountState } from '@service/account';
import { FeeAmount, calcPriceFromTick, calcAmountFromPrice, calcRatio, invertPrice, Pool, computePoolAddress, getPool } from '@service/pairs&pool';
import {
  getTokenByAddress,
  getUnwrapperTokenByAddress,
  stableTokens,
  nativeTokens,
  TokenUSDT,
  isTokenEqual,
  fetchTokenInfoByAddress,
  addTokenToList,
  type Token,
} from '@service/tokens';
import { getUserPositionIDs } from './apis';

import { groupBy, map, } from 'lodash-es';
import { UniswapV3Staker } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
import { poolsQuery, type IncentiveKeyDetail } from './allPools';
import { getUserFarmInfoOfPosition } from './myFarmInfo';

export enum PositionStatus {
  InRange = 'InRange',
  OutOfRange = 'OutOfRange',
  Closed = 'Closed',
}

export interface Position {
  id: number;
  address: string;
  nonce: number;
  operator: string;
  token0: Token;
  token1: Token;
  fee: FeeAmount;
  tickLower: number;
  tickUpper: number;
  // priceLower calculated by tickLower
  priceLower: Unit;
  // priceUpper calculated by tickUpper
  priceUpper: Unit;
  liquidity: string;
  /** The fee growth of token0 as of the last action on the individual position. */
  feeGrowthInside0LastX128: string;
  /** The fee growth of token1 as of the last action on the individual position. */
  feeGrowthInside1LastX128: string;
  /** The uncollected amount of token0 owed to the position as of the last computation. */
  tokensOwed0: string;
  /** The uncollected amount of token1 owed to the position as of the last computation. */
  tokensOwed1: string;
}

export interface PositionForUI extends Position {
  leftToken: Token | null;
  rightToken: Token | null;
  // priceLower for ui
  priceLowerForUI: Unit;
  // priceUpper for ui
  priceUpperForUI: Unit;
  // token0 amount in position
  amount0?: Unit;
  // token1 amount in position
  amount1?: Unit;
  // position token0 ratio
  ratio?: number;
  pool?: Pool | null | undefined;
  positionStatus?: PositionStatus;
}

const tokenIdsQuery = selector<Array<number> | []>({
  key: `earn-tokenIdsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    if (!account) return [];
    const tokenIdResults = await getUserPositionIDs(account);
    return tokenIdResults;
  },
});

export const decodePosition = async (tokenId: number, decodeRes: Array<any>) => {
  let token0 = getTokenByAddress(decodeRes?.[2])!;
  let token1 = getTokenByAddress(decodeRes?.[3])!;
  if (!token0) {
    token0 = (await fetchTokenInfoByAddress(decodeRes?.[2]))!;
    if (token0) addTokenToList(token0);
  }

  if (!token1) {
    token1 = (await fetchTokenInfoByAddress(decodeRes?.[3]))!;
    if (token1) addTokenToList(token1);
  }
  const fee = Number(decodeRes?.[4]);

  const address = computePoolAddress({
    tokenA: token0!,
    tokenB: token1!,
    fee: fee,
  });

  const position: Position = {
    id: tokenId,
    address: address,
    nonce: Number(decodeRes?.[0]),
    operator: String(decodeRes?.[1]),
    token0: token0,
    token1: token1,
    fee: fee,
    tickLower: Number(decodeRes?.[5]),
    tickUpper: Number(decodeRes?.[6]),
    liquidity: String(decodeRes?.[7]),
    feeGrowthInside0LastX128: String(decodeRes?.[8]),
    feeGrowthInside1LastX128: String(decodeRes?.[9]),
    tokensOwed0: String(decodeRes?.[10]),
    tokensOwed1: String(decodeRes?.[11]),
    priceLower: calcPriceFromTick({
      tick: Number(decodeRes?.[5]),
      tokenA: token0,
      tokenB: token1,
      fee: fee,
    }),
    priceUpper: calcPriceFromTick({
      tick: Number(decodeRes?.[6]),
      tokenA: token0,
      tokenB: token1,
      fee: fee,
    }),
  };
  return position;
};

export const positionQueryByTokenId = selectorFamily({
  key: `earn-positionQueryByTokenId-${import.meta.env.MODE}`,
  get: (tokenId: number) => async () => {
    const decodeRes = await NonfungiblePositionManager.func.positions(tokenId);
    const position = await decodePosition(tokenId, decodeRes);
    return position;
  },
});

export const positionsQueryByTokenIds = selectorFamily({
  key: `earn-positionsQueryByTokenIds-${import.meta.env.MODE}`,
  get:
    (tokenIdParams: Array<number>) =>
    async ({ get }) => {
      const account = get(accountState);
      if (!account || !tokenIdParams?.length) return [];
      const tokenIds = [...tokenIdParams];

      const positionsResult = await fetchMulticall(
        tokenIds.map((id) => [NonfungiblePositionManager.address, NonfungiblePositionManager.func.interface.encodeFunctionData('positions', [id])])
      );

      if (Array.isArray(positionsResult)) {
        const tmpRes = await Promise.all(
          positionsResult?.map(async (singleRes, index) => {
            const decodeRes = NonfungiblePositionManager.func.interface.decodeFunctionResult('positions', singleRes);
            const position = await decodePosition(tokenIds[index], decodeRes);

            return position;
          })
        );
        return await Promise.all(
          tmpRes.map(async (position) => {
            const { token0, token1, fee } = position;
            const pool = await getPool({ tokenA: token0, tokenB: token1, fee });
            const enhancedPosition = enhancePositionForUI(position, pool);
            if (pool) {
              const userFarmInfo = await getUserFarmInfoOfPosition({ position: enhancedPosition, pool });
              if (userFarmInfo) return { ...enhancedPosition, userFarmInfo };
            }
            return enhancedPosition;
          })
        );
      }

      return [];
    },
});

export const positionsQuery = selector<Array<Position>>({
  key: `earn-PositionListQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const tokenIds = get(tokenIdsQuery);
    return get(positionsQueryByTokenIds(tokenIds));
  },
});

export const PositionsForUISelector = selector<Array<PositionForUI>>({
  key: `earn-PositionListForUI-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const positions = get(positionsQuery);
    if (!positions) return [];
    const enhancedPositions = await Promise.all(
      positions.map(async (position) => {
        const { token0, token1, fee } = position;
        const pool = await getPool({ tokenA: token0, tokenB: token1, fee });
        const enhancedPosition = enhancePositionForUI(position, pool);
        if (pool) {
          const userFarmInfo = await getUserFarmInfoOfPosition({ position: enhancedPosition, pool });
          if (userFarmInfo) return { ...enhancedPosition, userFarmInfo };
        }
        return enhancedPosition;
      })
    );
    return enhancedPositions.reverse();
  },
});

export const useTokenIds = () => useRecoilValue(tokenIdsQuery);

export const usePositions = (tokenIds?: Array<number>) => {
  const allPositions = useRecoilValue(positionsQuery);
  const filterPositions = useMemo(() => (tokenIds ? allPositions.filter((position) => tokenIds.includes(position.id)) : allPositions), [allPositions, tokenIds]);
  return filterPositions;
};

export const useRefreshPositions = () => useRecoilRefresher_UNSTABLE(positionsQuery);

export const usePositionByTokenId = (tokenId: number) => useRecoilValue(positionQueryByTokenId(+tokenId));

export const usePositionsForUI = () => useRecoilValue_TRANSITION_SUPPORT_UNSTABLE(PositionsForUISelector);

export const getTokenPriority = (token: Token) => {
  if (isTokenEqual(token, TokenUSDT)) return 0;
  // e.g. USDC, AxCNH
  if (stableTokens.some((stableToken) => stableToken?.address.toLowerCase() === token.address.toLowerCase())) return 1;
  // cfx
  if (nativeTokens.some((nativeToken) => nativeToken?.address.toLowerCase() === token.address.toLowerCase())) return 2;

  return 3;
};

export const enhancePositionForUI = (position: Position, pool: Pool | null | undefined): PositionForUI => {
  const { token0, token1, priceLower, priceUpper, tickLower, tickUpper, liquidity } = position;
  const lower = new Unit(1.0001).pow(new Unit(tickLower));
  const upper = new Unit(1.0001).pow(new Unit(tickUpper));
  const [amount0, amount1] =
    pool?.token0Price && liquidity
      ? calcAmountFromPrice({ liquidity, lower, current: pool.token0Price.mul(`1e${token1.decimals - token0.decimals}`), upper })
      : [undefined, undefined];
  const ratio = tickLower && pool?.sqrtPriceX96 && tickUpper ? calcRatio(pool.sqrtPriceX96, tickLower, tickUpper) : undefined;

  const unwrapToken0 = getUnwrapperTokenByAddress(position.token0.address);
  const unwrapToken1 = getUnwrapperTokenByAddress(position.token1.address);

  const tickCurrent = pool?.tickCurrent;

  const positionStatus =
    liquidity === '0'
      ? PositionStatus.Closed
      : typeof tickCurrent !== 'number'
      ? undefined
      : tickCurrent < tickLower || tickCurrent > tickUpper
      ? PositionStatus.OutOfRange
      : PositionStatus.InRange;

  const originPosition = {
    ...position,
    amount0,
    amount1,
    ratio,
    rightToken: unwrapToken1,
    leftToken: unwrapToken0,
    priceLowerForUI: priceLower,
    priceUpperForUI: priceUpper,
    positionStatus,
    pool,
  };

  const invertPosition = {
    ...position,
    amount0,
    amount1,
    ratio,
    rightToken: unwrapToken0,
    leftToken: unwrapToken1,
    priceLowerForUI: invertPrice(priceUpper),
    priceUpperForUI: invertPrice(priceLower),
    positionStatus,
    pool,
  };

  const token0Priority = getTokenPriority(token0);
  const token1Priority = getTokenPriority(token1);

  if (token0Priority < token1Priority) return invertPosition;

  if (token0Priority > token1Priority) return originPosition;

  if (priceUpper.lessThanOrEqualTo(new Unit(1))) return invertPosition;
  return originPosition;
};

export const createPreviewPositionForUI = (
  position: Pick<Position, 'id' | 'fee' | 'token0' | 'token1' | 'tickLower' | 'tickUpper' | 'priceLower' | 'priceUpper'>,
  pool: Pool | null | undefined
) => enhancePositionForUI(position as Position, pool);

export const usePositionStatus = (position: PositionForUI) => useMemo(() => getPositionStatus(position), [position]);

export const getPositionStatus = (position: PositionForUI) => {
  const { liquidity, tickLower, tickUpper, pool } = position ?? {};
  const tickCurrent = pool?.tickCurrent;

  return liquidity === '0'
    ? PositionStatus.Closed
    : typeof tickCurrent !== 'number'
    ? undefined
    : tickCurrent < tickLower || tickCurrent > tickUpper
    ? PositionStatus.OutOfRange
    : PositionStatus.InRange;
};

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
    const account = get(accountState);
    if (!account) return null;

    const pools = get(poolsQuery);
    if (!pools) return null;

    const userPositionsQueryMulticall = await fetchChain<string>({
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

    console.log('positions in myFarmsQuery:', userPositions);

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

      const positions = map(groupedByTokenId, (incentiveItems, positionId) => {
        const activeRewards = mergeStakeRewardsByToken(
          incentiveItems.filter((item) => item.incentiveKey.status === 'active' && item.position.positionStatus === 'InRange'),
          item => item.incentiveKey.rewardToken.toLowerCase()
        );

        const rewards = mergeStakeRewardsByToken(
          incentiveItems.filter((item) => item.stakeReward.unsettledReward > 0n),
          item => item.incentiveKey.rewardToken.toLowerCase()
        );

        return {
          tokenId: Number(positionId),
          position: incentiveItems[0].position,
          isPositionActive: incentiveItems[0].position.positionStatus === 'InRange' && items.some(item => item.incentiveKey.status === 'active'),
          stakedIncentiveKeys: incentiveItems.filter((item) => item.stakeReward.boostedLiquidity > 0n).map((item) => item.incentiveKey),
          activeIncentiveKeys: incentiveItems.filter((item) => item.incentiveKey.status === 'active').map((item) => item.incentiveKey),
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
  },
});

export const useMyFarms = () => useRecoilValue_TRANSITION_SUPPORT_UNSTABLE(myFarmsQuery);
export const useRefreshMyFarms = () => useRecoilRefresher_UNSTABLE(myFarmsQuery);

