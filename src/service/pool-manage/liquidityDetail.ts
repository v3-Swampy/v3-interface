import { selectorFamily, useRecoilValue } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { NonfungiblePositionManager, NonfungiblePositionManagerContract, fetchMulticall } from '@contracts/index';
import { PositionsForUISelector } from './positions';
import { fetchChain } from '@utils/fetch';
import { poolState, generatePoolKey } from '@service/pairs&pool/singlePool';
import { accountState } from '@service/account';
import Decimal from 'decimal.js';

const MAX_UINT128 = new Unit(new Decimal(2).pow(128).sub(1).toString());

const liquidityDetailSelector = selectorFamily({
  key: `PositionDetailForUI-${import.meta.env.MODE}`,
  get:
    (tokenId) =>
    ({ get }) => {
      const positions = get(PositionsForUISelector);
      if (!positions) return undefined;
      return positions.find((position) => position.id === tokenId);
    },
});

export const positionOwnerQuery = selectorFamily({
  key: `positionOwnerQuery-${import.meta.env.MODE}`,
  get: (tokenId) => async () => {
    const response = await NonfungiblePositionManagerContract.ownerOf(tokenId);
    return response;
  },
});

export const isPositionOwnerSelector = selectorFamily({
  key: `isPositionOwner-${import.meta.env.MODE}`,
  get:
    (tokenId: number) =>
    ({ get }) => {
      return get(accountState) === get(positionOwnerQuery(tokenId));
    },
});

export const positionFeesQuery = selectorFamily({
  key: `positionFeesQuery-${import.meta.env.MODE}`,
  get:
    (tokenId: number) =>
    async ({ get }) => {
      const owner = get(positionOwnerQuery(tokenId));
      const tokenIdHexString = new Unit(tokenId).toHexMinUnit();
      if (NonfungiblePositionManagerContract && tokenIdHexString && owner) {
        return NonfungiblePositionManagerContract.collect
          .staticCall(
            {
              tokenId: tokenIdHexString,
              recipient: owner, // some tokens might fail if transferred to address(0)
              amount0Max: MAX_UINT128.toHexMinUnit(),
              amount1Max: MAX_UINT128.toHexMinUnit(),
            },
            { from: owner } // need to simulate the call as the owner
          )
          .then((results: any) => {
            return [results[0]?.toString(), results[1]?.toString()];
          });
      }
      return [undefined, undefined];
    },
});

export const useLiquidityDetail = (tokenId: number) => useRecoilValue(liquidityDetailSelector(tokenId));

export const usePositionOwner = (tokenId: number) => useRecoilValue(positionOwnerQuery(tokenId));

export const usePositionFees = (tokenId: number) => useRecoilValue(positionFeesQuery(tokenId));

export const useIsPositionOwner = (tokenId: number) => useRecoilValue(isPositionOwnerSelector(tokenId));
