import { selector, useRecoilValue } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/conflux';
import { NonfungiblePositionManager, fetchMulticall } from '@contracts/index';
import { accountState } from '@service/account';
import { FeeAmount, calcPriceFromTick } from '@service/pairs&pool';
import { getTokenByAddress, type Token } from '@service/tokens';
import { fetchChain } from '@utils/fetch';

export enum PositionStatus {
  InRange,
  OutOfRange,
  Closed,
}

export interface Position {
  id: number;
  nonce: number;
  operator: string;
  token0: Token;
  token1: Token;
  fee: FeeAmount;
  tickLower: number;
  tickUpper: number;
  priceLower: Unit;
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

const positionBalanceQuery = selector({
  key: `positionBalanceQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    if (!account) return undefined;
    const response = await fetchChain<string>({
      params: [
        {
          data: NonfungiblePositionManager.func.encodeFunctionData('balanceOf', [account]),
          to: NonfungiblePositionManager.address,
        },
        'latest',
      ],
    });

    const positionBalance = NonfungiblePositionManager.func.decodeFunctionResult('balanceOf', response)?.[0];
    return positionBalance ? Number(positionBalance) : 0;
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
      tokenIdsArgs.map((args) => [NonfungiblePositionManager.address, NonfungiblePositionManager.func.encodeFunctionData('tokenOfOwnerByIndex', args)])
    );
    if (Array.isArray(tokenIdResults))
      return tokenIdResults?.map((singleRes) => Number(NonfungiblePositionManager.func.decodeFunctionResult('tokenOfOwnerByIndex', singleRes)?.[0]));
    return [];
  },
});

const positionsQuery = selector({
  key: `PositionListQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    const tokenIds = get(tokenIdsQuery);
    if (!account || !tokenIds?.length) return undefined;

    const positionsResult = await fetchMulticall(tokenIds.map((id) => [NonfungiblePositionManager.address, NonfungiblePositionManager.func.encodeFunctionData('positions', [id])]));

    if (Array.isArray(positionsResult))
      return positionsResult?.map((singleRes, index) => {
        const decodeRes = NonfungiblePositionManager.func.decodeFunctionResult('positions', singleRes);

        const position: Position = {
          id: tokenIds[index],
          nonce: Number(decodeRes?.[0]),
          operator: String(decodeRes?.[1]),
          token0: getTokenByAddress(decodeRes?.[2])!,
          token1: getTokenByAddress(decodeRes?.[3])!,
          fee: Number(decodeRes?.[4]),
          tickLower: Number(decodeRes?.[5]),
          tickUpper: Number(decodeRes?.[6]),
          liquidity: String(decodeRes?.[7]),
          feeGrowthInside0LastX128: String(decodeRes?.[8]),
          feeGrowthInside1LastX128: String(decodeRes?.[9]),
          tokensOwed0: String(decodeRes?.[10]),
          tokensOwed1: String(decodeRes?.[11]),
          priceLower: calcPriceFromTick({
            tick: Number(decodeRes?.[5]),
            tokenA: getTokenByAddress(decodeRes?.[2])!,
            tokenB: getTokenByAddress(decodeRes?.[3])!,
            fee: Number(decodeRes?.[4]),
          }),
          priceUpper: calcPriceFromTick({
            tick: Number(decodeRes?.[6]),
            tokenA: getTokenByAddress(decodeRes?.[2])!,
            tokenB: getTokenByAddress(decodeRes?.[3])!,
            fee: Number(decodeRes?.[4]),
          }),
        };
        return position;
      });
    return [];
  },
});

export const usePositionBalance = () => useRecoilValue(positionBalanceQuery);

export const useTokenIds = () => useRecoilValue(tokenIdsQuery);

export const usePositions = () => useRecoilValue(positionsQuery);
