import { selectorFamily, useRecoilValue } from 'recoil';
import { getRecoil } from 'recoil-nexus';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { NonfungiblePositionManager } from '@contracts/index';
import { sendTransaction } from '@service/account';
import { PositionsForUISelector } from './positions';
import { trimDecimalZeros } from '@utils/numberUtils';
import { accountState } from '@service/account';
import { addRecordToHistory } from '@service/history';
import Decimal from 'decimal.js';

const MAX_UINT128 = new Unit(new Decimal(2).pow(128).sub(1).toString());

const positionSelector = selectorFamily({
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
    const response = await NonfungiblePositionManager.func.ownerOf(tokenId);
    return response;
  },
});

export const isPositionOwnerSelector = selectorFamily({
  key: `isPositionOwner-${import.meta.env.MODE}`,
  get:
    (tokenId: number) =>
    ({ get }) => {
      return get(accountState)?.toLowerCase() === get(positionOwnerQuery(tokenId))?.toLowerCase();
    },
});

export const positionFeesQuery = selectorFamily({
  key: `positionFeesQuery-${import.meta.env.MODE}`,
  get:
    (tokenId: number) =>
    async ({ get }) => {
      const owner = get(positionOwnerQuery(tokenId));
      const tokenIdHexString = new Unit(tokenId).toHexMinUnit();
      if (NonfungiblePositionManager && tokenIdHexString && owner) {
        return NonfungiblePositionManager.func.collect
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
            return [results[0], results[1]];
          });
      }
      return [undefined, undefined];
    },
});

export const collectFees = async (tokenId: number) => {
  try {
    const tokenIdHexString = new Unit(tokenId).toHexMinUnit();
    const owner = getPositionOwner(tokenId)
    const position = getPosition(tokenId)
    const [fee0, fee1] = getPositionFees(tokenId)
    const {token0, token1} = position!;
    const data = NonfungiblePositionManager.func.interface.encodeFunctionData('collect', [
      {
        tokenId: tokenIdHexString,
        recipient: owner, // some tokens might fail if transferred to address(0)
        amount0Max: MAX_UINT128.toHexMinUnit(),
        amount1Max: MAX_UINT128.toHexMinUnit(),
      },
    ]);
    const txHash = await sendTransaction({
      data,
      to: NonfungiblePositionManager.address,
    });
    addRecordToHistory({
      txHash,
      type: 'CollectFees',
      tokenA_Address: token0.address,
      tokenA_Value: trimDecimalZeros((new Unit(fee0)?.toDecimalStandardUnit(5, token0.decimals))),
      tokenB_Address: token1.address,
      tokenB_Value: trimDecimalZeros((new Unit(fee1)?.toDecimalStandardUnit(5, token0.decimals))),
    });
  } catch (err) {
    console.error('collectFees failed:', err);
  }
};

export const usePosition = (tokenId: number) => useRecoilValue(positionSelector(tokenId));

export const usePositionOwner = (tokenId: number) => useRecoilValue(positionOwnerQuery(tokenId));

export const usePositionFees = (tokenId: number) => useRecoilValue(positionFeesQuery(tokenId));

export const useIsPositionOwner = (tokenId: number) => useRecoilValue(isPositionOwnerSelector(tokenId));

export const getPositionOwner = (tokenId: number) => getRecoil(positionOwnerQuery(tokenId));

export const getPosition = (tokenId: number) => getRecoil(positionSelector(tokenId));

export const getPositionFees = (tokenId: number) => getRecoil(positionFeesQuery(tokenId));
