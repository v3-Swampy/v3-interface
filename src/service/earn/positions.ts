import { useMemo } from 'react';
import { selector, useRecoilValue_TRANSITION_SUPPORT_UNSTABLE, useRecoilRefresher_UNSTABLE, selectorFamily } from 'recoil';
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
import { getIncentivesByPools, getUserPositionIDs } from './apis';
import { getPositionFees } from './positionDetail';
import { getUserFarmInfoOfPosition } from './myFarmInfo';
import { PositionStatus } from '@type/position';
import { getTimestamp } from './timestamp';

export interface Position {
  tokenId: number;
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

export type PositionEnhanced = PositionForUI &
  Partial<Awaited<ReturnType<typeof getUserFarmInfoOfPosition>>> & { unclaimedFees?: readonly [Unit, Unit] | readonly [undefined, undefined] };

const tokenIdsQuery = selector<Array<number> | []>({
  key: `earn-tokenIdsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    if (!account) return [];
    const tokenIdResults = await getUserPositionIDs(account);
    return tokenIdResults;
  },
});

const decodePosition = async (tokenId: number, decodeRes: Array<any>) => {
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
    tokenId: tokenId,
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

const positionsQueryByTokenIds = selectorFamily({
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
        return Promise.all(
          positionsResult.map(async (singleRes, index) => {
            const decodeRes = NonfungiblePositionManager.func.interface.decodeFunctionResult('positions', singleRes);
            const position = await decodePosition(tokenIds[index], decodeRes);

            return position;
          })
        );
      }

      return [];
    },
});

const positionsQuery = selector<Array<Position>>({
  key: `earn-PositionListQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const tokenIds = get(tokenIdsQuery);
    return get(positionsQueryByTokenIds(tokenIds));
  },
});

export const PositionsForUISelector = selector<Array<PositionEnhanced>>({
  key: `earn-PositionListForUI-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const positions = get(positionsQuery);
    if (positions.length === 0) return [];
    const timestamp = await getTimestamp();
    const incentives = await getIncentivesByPools({
      pools: positions.map((p) => p.address),
      currentTimestamp: timestamp,
    });
    const rewardTokensMap: Record<string, string[] | undefined> = {};
    incentives.forEach((incentive) => {
      const poolAddress = incentive.pool.toLowerCase();
      if (rewardTokensMap[poolAddress]) {
        rewardTokensMap[poolAddress].push(incentive.rewardToken);
      } else {
        rewardTokensMap[poolAddress] = [incentive.rewardToken];
      }
    });
    const enhancedPositions = await Promise.all(
      positions.map(async (position) => {
        const { token0, token1, fee } = position;
        const poolAddress = position.address.toLowerCase();
        const pool = await getPool({ tokenA: token0, tokenB: token1, fee });
        const positionForUI = enhancePositionForUI(position, pool);
        const unclaimedFees = await getPositionFees(position.tokenId);
        if (pool) {
          const userFarmInfo = await getUserFarmInfoOfPosition({ position: positionForUI, pool, rewardTokens: rewardTokensMap[poolAddress] ?? [] });
          if (userFarmInfo) return { ...positionForUI, ...userFarmInfo, unclaimedFees };
        }
        return { ...positionForUI, unclaimedFees };
      })
    );
    enhancedPositions.sort((a, b) => {
      if (a.positionStatus === PositionStatus.Closed && b.positionStatus !== PositionStatus.Closed) return 1;
      if (a.positionStatus !== PositionStatus.Closed && b.positionStatus === PositionStatus.Closed) return -1;
      return b.tokenId - a.tokenId;
    });
    return enhancedPositions;
  },
});

export const useRefreshPositionsForUI = () => useRecoilRefresher_UNSTABLE(PositionsForUISelector);

export const usePositionsForUI = () => useRecoilValue_TRANSITION_SUPPORT_UNSTABLE(PositionsForUISelector);

export const getTokenPriority = (token: Token) => {
  if (isTokenEqual(token, TokenUSDT)) return 0;
  // e.g. USDC, AxCNH
  if (stableTokens.some((stableToken) => stableToken?.address.toLowerCase() === token.address.toLowerCase())) return 1;
  // cfx
  if (nativeTokens.some((nativeToken) => nativeToken?.address.toLowerCase() === token.address.toLowerCase())) return 2;

  return 3;
};

const enhancePositionForUI = (position: Position, pool: Pool | null | undefined): PositionForUI => {
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
  position: Pick<Position, 'tokenId' | 'fee' | 'token0' | 'token1' | 'tickLower' | 'tickUpper' | 'priceLower' | 'priceUpper'>,
  pool: Pool | null | undefined
) => enhancePositionForUI(position as Position, pool);

export const usePositionStatus = (position: PositionEnhanced) => useMemo(() => getPositionStatus(position), [position]);

const getPositionStatus = (position: PositionEnhanced) => {
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
