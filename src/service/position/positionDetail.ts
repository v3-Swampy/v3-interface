import { selectorFamily, useRecoilValue } from 'recoil';
import { getRecoil } from 'recoil-nexus';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { NonfungiblePositionManager } from '@contracts/index';
import { sendTransaction } from '@service/account';
import { PositionForUI, PositionsForUISelector } from './positions';
import { accountState } from '@service/account';
import { addRecordToHistory } from '@service/history';
import { ZeroAddress } from '@service/swap';
import Decimal from 'decimal.js';

const MAX_UINT128 = new Unit(new Decimal(2).pow(128).sub(1).toString());

const positionSelector = selectorFamily<PositionForUI | undefined, number>({
  key: `PositionDetailForUI-${import.meta.env.MODE}`,
  get:
    (tokenId: number) =>
    ({ get }) => {
      const positions = get(PositionsForUISelector);
      if (!positions) return undefined;
      return positions.find((position) => position.id === tokenId);
    },
});

export const positionOwnerQuery = selectorFamily({
  key: `positionOwnerQuery-${import.meta.env.MODE}`,
  get: (tokenId: number) => async () => {
    return (await NonfungiblePositionManager.func.ownerOf(tokenId)) as string;
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
        return await NonfungiblePositionManager.func.collect
          .staticCall(
            {
              tokenId: tokenIdHexString,
              recipient: owner, // some tokens might fail if transferred to address(0)
              amount0Max: MAX_UINT128.toHexMinUnit(),
              amount1Max: MAX_UINT128.toHexMinUnit(),
            },
            { from: owner } // need to simulate the call as the owner
          )
          .then((results) => {
            return [new Unit(results[0]), new Unit(results[1])] as const;
          });
      }
      return [undefined, undefined] as const;
    },
});

export const handleCollectFees = async (tokenId: number) => {
  const tokenIdHexString = new Unit(tokenId).toHexMinUnit();
  const owner = getPositionOwner(tokenId);
  const position = getPosition(tokenId);
  const [fee0, fee1] = getPositionFees(tokenId);
  console.log('fee', fee0, fee1);
  if(!owner || !position || (!fee0 && !fee1)) return ''
  const { token0, token1 } = position;
  const hasWCFX = token0.symbol === 'WCFX' || token1.symbol === 'WCFX';
  const data0 = NonfungiblePositionManager.func.interface.encodeFunctionData('collect', [
    {
      tokenId: tokenIdHexString,
      recipient: hasWCFX ? ZeroAddress : owner, // some tokens might fail if transferred to address(0)
      amount0Max: MAX_UINT128.toHexMinUnit(),
      amount1Max: MAX_UINT128.toHexMinUnit(),
    },
  ]);
  const data1 = NonfungiblePositionManager.func.interface.encodeFunctionData('unwrapWETH9', [
    token0.symbol === 'WCFX' ? fee0.toHexMinUnit() : fee1.toHexMinUnit(),
    owner,
  ]);

  const data2 = NonfungiblePositionManager.func.interface.encodeFunctionData('sweepToken', [
    token0.symbol === 'WCFX' ? token1.address : token0.address,
    token0.symbol === 'WCFX' ? fee1.toHexMinUnit() : fee0.toHexMinUnit(),
    owner,
  ]);

  const transactionParams = {
    data: NonfungiblePositionManager.func.interface.encodeFunctionData('multicall', [hasWCFX ? [data0, data1, data2] : [data0]]),
    to: NonfungiblePositionManager.address,
  }
  const txHash = await sendTransaction(transactionParams);
  addRecordToHistory({
    txHash,
    type: 'Position_CollectFees',
    tokenA_Address: token0.address,
    tokenA_Value: fee0 ? new Unit(fee0)?.toDecimalStandardUnit(undefined, token0.decimals) : '',
    tokenB_Address: token1.address,
    tokenB_Value: fee1 ? new Unit(fee1)?.toDecimalStandardUnit(undefined, token0.decimals) : '',
  });
  return txHash;
};

export const usePosition = (tokenId: number) => useRecoilValue(positionSelector(+tokenId));

export const usePositionOwner = (tokenId: number) => useRecoilValue(positionOwnerQuery(+tokenId));

export const usePositionFees = (tokenId: number) => useRecoilValue(positionFeesQuery(+tokenId));

export const useIsPositionOwner = (tokenId: number) => useRecoilValue(isPositionOwnerSelector(+tokenId));

export const getPositionOwner = (tokenId: number) => getRecoil(positionOwnerQuery(+tokenId));

export const getPosition = (tokenId: number) => getRecoil(positionSelector(+tokenId));

export const getPositionFees = (tokenId: number) => getRecoil(positionFeesQuery(+tokenId));
