import { useMemo } from 'react';
import { UniswapV3StakerFactory } from '@contracts/index';
import { selector, selectorFamily, useRecoilValue } from 'recoil';
import { accountState } from '@service/account';
import { getPastIncentivesOfPool, computeIncentiveKey } from './';
import { VSTTokenContract } from '@contracts/index';
import { sendTransaction } from '@cfxjs/use-wallet-react/ethereum';
import { getRecoil } from 'recoil-nexus';
import { positionQueryByTokenId, positionsQueryByTokenIds,PositionForUI } from '@service/position';
import { usePoolList } from '@service/farming/index';
import { getCurrentIncentiveIndex, IncentiveKey, getCurrentIncentiveKey } from '@service/farming';
import { fetchMulticall } from '@contracts/index';

export interface FarmingPosition extends PositionForUI {
  isActive:boolean; //whether the incentive status of this position is active,that is when the incentive that you are in is your current incentive, it is true.
  whichIncentiveTokenIn:IncentiveKey
}
/**
 * Get the staked token id of user
 */
const stakedTokenIdsState = selector({
  key: `stakedTokenIds-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);

    if (!account) return [];

    const length = Number(await UniswapV3StakerFactory.func.tokenIdsLength(account));

    const tokenIds =
      (
        await fetchMulticall(
          Array.from({ length }).map((_, i) => [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('tokenIds', [account, i])])
        )
      )?.map((r) => UniswapV3StakerFactory.func.interface.decodeFunctionResult('tokenIds', r)[0]) || [];

    const stakedTokenIds =
      (await fetchMulticall(tokenIds.map((tokenId) => [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('deposits', [tokenId])])))
        ?.map((d, i) => (UniswapV3StakerFactory.func.interface.decodeFunctionResult('deposits', d)[1] > 0 ? Number(tokenIds[i]) : null))
        .filter((d) => d !== null) || [];

    return stakedTokenIds as number[];
  },
});

/**
 * Get which incentive the tokenId in
 */
const whichIncentiveTokenIdInState = selectorFamily({
  key: `whichIncentive-${import.meta.env.MODE}`,
  get:
    (tokenId: number) =>
    async ({ get }) => {
      const position = get(positionQueryByTokenId(tokenId));
      const incentives = getPastIncentivesOfPool(position?.address);
      let res: { index: number; incentive: IncentiveKey; incentiveId: string }= null!; // TODO: Not sure if null is possible
      for (let index = 0; index < incentives.length; index++) {
        const incentive = incentives[index];
        const incentiveId = computeIncentiveKey(incentive);
        const [, liquidity] = await UniswapV3StakerFactory.func.stakes(tokenId, incentiveId);
        if (Number(liquidity) > 0) {
          res = {
            index,
            incentive,
            incentiveId,
          } as const;
          break;
        }
      }
      return res;
    },
});

const stakedPositionsQuery = selector<Array<FarmingPosition>>({
  key: `StakedPositionsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const stakedTokenIds = get(stakedTokenIdsState);
    const stakedPositions=get(positionsQueryByTokenIds(stakedTokenIds))
    const currentIndex=getCurrentIncentiveIndex()
    const _stakedPositions:Array<FarmingPosition>=[]
    stakedPositions.map((position)=>{
      const _position={...position} as FarmingPosition
      const whichIncentiveTokenIn=get(whichIncentiveTokenIdInState(position.id))
      _position.isActive=whichIncentiveTokenIn.index==currentIndex
      _position.whichIncentiveTokenIn=getCurrentIncentiveKey(position.address)
      _stakedPositions.push(_position)
    })
    return _stakedPositions
  },
});

export const useStakedTokenIds = () => {
  const stakedTokenIds = useRecoilValue(stakedTokenIdsState);
  return stakedTokenIds;
};

/**
 * Claim&Unstake for active or ended incentive
 * active incentive: current incentive
 * ended  incentive: the incentive that tokenId in
 *
 * for two actions:
 *  unstake for active incentives
 *  claim&UnStake for ended incentives
 */
export const handleClaimUnStake = async (isActive: boolean, key: IncentiveKey, tokenId: number, pid: number, accountAddress: string) => {
  if (!accountAddress) return;
  const methodName = isActive ? 'unstakeToken' : 'unstakeTokenAtEnd';
  const data0 = UniswapV3StakerFactory.func.interface.encodeFunctionData(methodName, [key, tokenId, pid]);
  const data1 = UniswapV3StakerFactory.func.interface.encodeFunctionData('claimReward', [VSTTokenContract.address, accountAddress, 0]);
  const data2 = UniswapV3StakerFactory.func.interface.encodeFunctionData('withdrawToken', [tokenId, accountAddress]);
  const txHash = await sendTransaction({
    to: UniswapV3StakerFactory.address,
    data: UniswapV3StakerFactory.func.interface.encodeFunctionData('multicall', [[data0, data1, data2]]),
  });
};

/**
 * Claim&Unstake&reStake for active or ended incentive
 * active incentive: current incentive
 * ended  incentive: the incentive that tokenId in
 *
 * for two actions：
 *   claim&UnStake&ReStake for ended incentives
 *   claim                 for active incentives
 */
export const handleClaimAndReStake = async (
  isActive: boolean,
  keyThatTokenIdIn: IncentiveKey,
  currentIncentiveKey: IncentiveKey,
  tokenId: number,
  pid: number,
  accountAddress: string
) => {
  const methodName = isActive ? 'unstakeToken' : 'unstakeTokenAtEnd';
  const data0 = UniswapV3StakerFactory.func.interface.encodeFunctionData(methodName, [keyThatTokenIdIn, tokenId, pid]);
  const data1 = UniswapV3StakerFactory.func.interface.encodeFunctionData('claimReward', [VSTTokenContract.address, accountAddress, 0]);
  const data2 = UniswapV3StakerFactory.func.interface.encodeFunctionData('stakeToken', [currentIncentiveKey, tokenId, pid]);
  const txHash = await sendTransaction({
    to: UniswapV3StakerFactory.address,
    data: UniswapV3StakerFactory.func.interface.encodeFunctionData('multicall', [[data0, data1, data2]]),
  });
};

export const getwhichIncentiveTokenIdIn = (tokenId: number) => getRecoil(whichIncentiveTokenIdInState(+tokenId));

export const useWhichIncentiveTokenIdIn = (tokenId: number) => useRecoilValue(whichIncentiveTokenIdInState(+tokenId));

export const useStakedPositions = () => useRecoilValue(stakedPositionsQuery);

export const useMyFarmingList = () => {
  const { poolList } = usePoolList();
  const stakedPostions = useStakedPositions();
  const myFarmingList = useMemo(() => {
    const stakedPoolAddresses: Array<string> = [];
    stakedPostions.forEach((stakedPostion) => stakedPoolAddresses.push(stakedPostion.address));
    const stakedPools = poolList.filter((p) => stakedPoolAddresses.indexOf(p.address) != -1);
    return stakedPools;
  }, [poolList, stakedPostions]);

  return myFarmingList;
};

export const useStakedPositionsByPool = (poolAddress: string, isActive:boolean) => {
  const stakedPostions = useStakedPositions();
  const positions = useMemo(() => stakedPostions.filter((position) => position.address == poolAddress&&position.isActive==isActive), [stakedPostions]);
  return positions;
};

export const useIsPositionActive = (tokenId: number) => {
  const whichIncentiveTokenIDIn = useWhichIncentiveTokenIdIn(tokenId);
  return useMemo(() => {
    return whichIncentiveTokenIDIn.index == getCurrentIncentiveIndex();
  }, [tokenId.toString()]);
};
