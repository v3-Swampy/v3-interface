import { selector, useRecoilValue } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { NonfungiblePositionManager, MulticallContract, fetchMulticall } from '@contracts/index';
import { accountState } from '@service/account';
import { FeeAmount, calcPriceFromTick, calcAmountFromPrice, calcRatio, invertPrice } from '@service/pairs&pool';
import { getTokenByAddress, getUnwrapperTokenByAddress, type Token, stableTokens, baseTokens } from '@service/tokens';
import { poolState, generatePoolKey } from '@service/pairs&pool/singlePool';
import { computePoolAddress } from '@service/pairs&pool';

export enum PositionStatus {
  InRange,
  OutOfRange,
  Closed,
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
  amount0: Unit;
  // token1 amount in position
  amount1: Unit;
  // position token0 ratio
  ratio: number | undefined;
}

const positionBalanceQuery = selector({
  key: `positionBalanceQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    if (!account) return undefined;
    const response = await NonfungiblePositionManager.func.balanceOf(account);
    return response ? Number(response.toString()) : 0;
  },
});

const tokenIdsQuery = selector<Array<number> | undefined>({
  key: `tokenIdsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    const positionBalance = get(positionBalanceQuery);
    if (!account || !positionBalance) return undefined;

    const tokenIdsArgs = account && positionBalance && positionBalance > 0 ? Array.from({ length: positionBalance }, (_, index) => [account, index]) : [];

    const tokenIdResults = await fetchMulticall(
      tokenIdsArgs.map((args) => [NonfungiblePositionManager.address, NonfungiblePositionManager.func.interface.encodeFunctionData('tokenOfOwnerByIndex', args)])
    );

    if (Array.isArray(tokenIdResults))
      return tokenIdResults?.map((singleRes) => Number(NonfungiblePositionManager.func.interface.decodeFunctionResult('tokenOfOwnerByIndex', singleRes)?.[0]));
    return [];
  },
});

const positionsQuery = selector({
  key: `PositionListQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    const _tokenIds = get(tokenIdsQuery);

    if (!account || !_tokenIds?.length) return undefined;
    const tokenIds = [..._tokenIds];
    console.log('tokenIds', tokenIds, Array.isArray(tokenIds));

    console.log(
      'test',
      tokenIds.map((id) => [NonfungiblePositionManager.address, NonfungiblePositionManager.func.interface.encodeFunctionData('positions', [id])])
    );

    const positionsResult = await fetchMulticall(
      tokenIds.map((id) => [NonfungiblePositionManager.address, NonfungiblePositionManager.func.interface.encodeFunctionData('positions', [id])])
    );

    console.log('positions', positionsResult);

    if (Array.isArray(positionsResult))
      return positionsResult?.map((singleRes, index) => {
        const decodeRes = NonfungiblePositionManager.func.interface.decodeFunctionResult('positions', singleRes);

        const token0 = getTokenByAddress(decodeRes?.[2])!;
        const token1 = getTokenByAddress(decodeRes?.[3])!;
        const fee = Number(decodeRes?.[4]);

        const address = computePoolAddress({
          tokenA: token0,
          tokenB: token1,
          fee: fee,
        });

        const position: Position = {
          id: tokenIds[index],
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
      });
    return [];
  },
});

export const PositionsForUISelector = selector({
  key: `PositionListForUI-${import.meta.env.MODE}`,
  get: ({ get }) => {
    const positions = get(positionsQuery);
    if (!positions) return [];
    return positions.map((position) => {
      const { token0, token1, priceLower, priceUpper, fee, tickLower, tickUpper, liquidity } = position;
      const pool = get(poolState(generatePoolKey({ tokenA: token0, tokenB: token1, fee })));

      const lower = new Unit(1.0001).pow(new Unit(tickLower));
      const upper = new Unit(1.0001).pow(new Unit(tickUpper));
      const [amount0, amount1] = pool?.token0Price ? calcAmountFromPrice({ liquidity, lower, current: pool?.token0Price, upper }) : [];
      const ratio = lower && pool && upper ? calcRatio(lower, pool.token0Price, upper) : undefined;

      const unwrapToken0 = getUnwrapperTokenByAddress(position.token0.address);
      const unwrapToken1 = getUnwrapperTokenByAddress(position.token1.address);
      if (
        // if token0 is a dollar-stable asset, set it as the quote token
        stableTokens.some((stableToken) => stableToken?.address === token0.address) ||
        // if token1 is an ETH-/BTC-stable asset, set it as the base token
        baseTokens.some((baseToken) => baseToken?.address === token1.address) ||
        // if both prices are below 1, invert
        priceUpper.lessThan(new Unit(1))
      ) {
        return {
          ...position,
          amount0,
          amount1,
          ratio,
          rightToken: unwrapToken1,
          leftToken: unwrapToken0,
          priceLowerForUI: invertPrice(priceUpper),
          priceUpperForUI: invertPrice(priceLower),
        };
      }
      return {
        ...position,
        amount0,
        amount1,
        ratio,
        rightToken: unwrapToken0,
        leftToken: unwrapToken1,
        priceLowerForUI: priceLower,
        priceUpperForUI: priceUpper,
      };
    });
  },
});

export const usePositionBalance = () => useRecoilValue(positionBalanceQuery);

export const useTokenIds = () => useRecoilValue(tokenIdsQuery);

export const usePositions = () => useRecoilValue(positionsQuery);

export const usePositionsForUI = () => useRecoilValue(PositionsForUISelector);