import { useMemo } from 'react';
import { UniswapV3StakerFactory } from '@contracts/index';
import { selector, selectorFamily, useRecoilValue } from 'recoil';
import { accountState } from '@service/account';
import { getPastIncentivesOfPool, computeIncentiveKey } from './';
import { VSTTokenContract } from '@contracts/index';
import { sendTransaction } from '@cfxjs/use-wallet-react/ethereum';
import { getRecoil } from 'recoil-nexus';
import { Position, positionQueryByTokenId, positionsQueryByTokenIds } from '@service/position';
import { usePoolList } from '@service/farming/index';
import { getCurrentIncentiveIndex,IncentiveKey,getCurrentIncentiveKey } from '@service/farming';


/**
 * Get the staked token id of user
 */
const stakedTokenIdsState = selector({
  key: `stakedTokenIds-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const stakedTokenIds = [];
    const account = get(accountState);
    if (!account) return [];
    const response = await UniswapV3StakerFactory.func.tokenIdsLength(account);
    const tokenIdsLength = Number(response.toString());
    if (tokenIdsLength == 0) return [];
    for (let index = 0; index < tokenIdsLength; index++) {
      const tokenId = await UniswapV3StakerFactory.func.tokenIds(account, index);
      const deposits = await UniswapV3StakerFactory.func.deposits(tokenId);
      if (Array.isArray(deposits) && deposits[1] > 0) {
        stakedTokenIds.push(Number(tokenId));
      }
    }
    return stakedTokenIds;
  },
});

/**
 * Get which incentive the tokenId in
 */
const whichIncentiveTokenIdInState = selectorFamily<{index:number,incentive:IncentiveKey,incentiveId:string},number>({
  key: `whichIncentive-${import.meta.env.MODE}`,
  get:
    (tokenId: number) =>
    async ({ get }) => {
      const position = get(positionQueryByTokenId(tokenId));
      const incentives = getPastIncentivesOfPool(position?.address);
      let res = {};
      for (let index = 0; index < incentives.length; index++) {
        const incentive = incentives[index];
        const incentiveId = computeIncentiveKey(incentive);
        const [, liquidity] = await UniswapV3StakerFactory.func.stakes(tokenId, incentiveId);
        if (Number(liquidity) > 0) {
          res = {
            index,
            incentive,
            incentiveId,
          };
          break;
        }
      }
      return res;
    },
});

const stakedPositionsQuery = selector<Array<Position>>({
  key: `StakedPositionsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const stakedTokenIds = get(stakedTokenIdsState);
    return get(positionsQueryByTokenIds(stakedTokenIds));
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
export const handleClaimUnStake = async ( isActive:boolean,key:IncentiveKey, tokenId: number, pid: number, accountAddress: string ) => {
  if(!accountAddress) return ;
  const methodName=isActive?'unstakeToken':'unstakeTokenAtEnd'
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
  isActive:boolean,
  keyThatTokenIdIn:IncentiveKey,
  currentIncentiveKey:IncentiveKey,
  tokenId:number,
  pid:number,
  accountAddress:string
) => {
  const methodName=isActive?'unstakeToken':'unstakeTokenAtEnd'
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

export const useStakedPositionsByPool = (poolAddress: string) => {
  const stakedPostions = useStakedPositions();
  const positions = useMemo(() => stakedPostions.filter((position) => position.address == poolAddress), [stakedPostions]);
  return positions;
};

export const useIsPositionActive=(tokenId:number)=>{
  const whichIncentiveTokenIDIn=useWhichIncentiveTokenIdIn(tokenId)
  return useMemo(()=>{
    return whichIncentiveTokenIDIn.index==getCurrentIncentiveIndex()
  },[tokenId.toString()])
}