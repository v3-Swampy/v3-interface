import { selectorFamily, useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import { getRecoil } from 'recoil-nexus';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { UniswapV3Staker, AutoPositionManager } from '@contracts/index';
import { sendTransaction } from '@service/account';
import { PositionEnhanced, PositionsForUISelector } from './positions';
import { accountState } from '@service/account';
import { addRecordToHistory } from '@service/history';
import Decimal from 'decimal.js';
import { UnclaimedRewardInfo } from './myFarmInfo';
import { getWrapperTokenByAddress } from '@service/tokens';

export const MAX_UINT128 = new Unit(new Decimal(2).pow(128).sub(1).toString());

const positionSelector = selectorFamily<PositionEnhanced | undefined, number>({
  key: `PositionDetailForUI-${import.meta.env.MODE}`,
  get:
    (tokenId: number) =>
    ({ get }) => {
      const positions = get(PositionsForUISelector);
      if (!positions) return undefined;
      return positions.find((position) => position.tokenId === tokenId);
    },
});

export const positionOwnerSelector = selectorFamily({
  key: `positionOwner-${import.meta.env.MODE}`,
  get: (tokenId: number) => async () => {
    const result = await UniswapV3Staker.func.deposits(tokenId);
    return result[0] as string; // 明确取第一个返回值 owner
  },
});

export const isPositionOwnerSelector = selectorFamily({
  key: `isPositionOwner-${import.meta.env.MODE}`,
  get:
    (tokenId: number) =>
    ({ get }) => {
      return get(accountState)?.toLowerCase() === get(positionOwnerSelector(tokenId))?.toLowerCase();
    },
});

export const positionFeesSelector = selectorFamily({
  key: `positionFees-${import.meta.env.MODE}`,
  get:
    (tokenId: number) =>
    async ({ get }) => {
      const owner = get(positionOwnerSelector(tokenId));
      const tokenIdHexString = new Unit(tokenId).toHexMinUnit();

      if (AutoPositionManager && tokenIdHexString && owner) {
        return await AutoPositionManager.func.collect
          .staticCall(
            {
              tokenId: tokenIdHexString,
              recipient: owner,
              amount0Max: MAX_UINT128.toHexMinUnit(),
              amount1Max: MAX_UINT128.toHexMinUnit(),
            },
            [],
            { from: owner }
          )
          .then((results) => {
            return [new Unit(results[0]), new Unit(results[1])] as const;
          });
      }
      return [undefined, undefined] as const;
    },
});

export const handleCollectFees = async ({
  tokenId,
  refreshPositionFees,
  unclaimedRewards,
}: {
  tokenId: number;
  refreshPositionFees: VoidFunction;
  unclaimedRewards: UnclaimedRewardInfo[] | undefined;
}) => {
  const tokenIdHexString = new Unit(tokenId).toHexMinUnit();
  const owner = getPositionOwner(tokenId);
  const position = getPosition(tokenId);
  // 提取所有奖励 token 地址
  const rewardTokens = (unclaimedRewards?.map((reward) => getWrapperTokenByAddress(reward.rewardTokenInfo?.address)?.address).filter(Boolean) as string[]) || [];
  const [fee0, fee1] = getPositionFees(tokenId);

  if (!owner || !position || (!fee0 && !fee1 && !unclaimedRewards?.length)) return '';

  const data = AutoPositionManager.func.interface.encodeFunctionData('collect', [
    {
      tokenId: tokenIdHexString,
      recipient: owner,
      amount0Max: MAX_UINT128.toHexMinUnit(),
      amount1Max: MAX_UINT128.toHexMinUnit(),
    },
    rewardTokens,
  ]);

  console.log('Collect Fees Data:', { tokenIdHexString, owner, fee0: fee0?.toString(), fee1: fee1?.toString(), rewardTokens, data });

  const transactionParams = {
    data: data,
    to: AutoPositionManager.address,
  };
  const txHash = await sendTransaction(transactionParams);
  addRecordToHistory({
    txHash,
    type: 'Position_CollectFees',
    positionId: `${tokenId}`,
  }).then(() => {
    refreshPositionFees();
  });
  return txHash;
};

export const usePosition = (tokenId: number) => useRecoilValue(positionSelector(+tokenId));

export const usePositionOwner = (tokenId: number) => useRecoilValue(positionOwnerSelector(+tokenId));

export const usePositionFees = (tokenId: number) => useRecoilValue(positionFeesSelector(+tokenId));
export const useRefreshPositionFees = (tokenId: number | string | undefined) => useRecoilRefresher_UNSTABLE(positionFeesSelector(tokenId ? +tokenId : -1));

export const useIsPositionOwner = (tokenId: number) => useRecoilValue(isPositionOwnerSelector(+tokenId));

export const getPositionOwner = (tokenId: number) => getRecoil(positionOwnerSelector(+tokenId));

export const getPosition = (tokenId: number) => getRecoil(positionSelector(+tokenId));

export const getPositionFees = (tokenId: number) => getRecoil(positionFeesSelector(+tokenId));
