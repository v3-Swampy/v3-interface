import { useMemo,useState,useEffect } from 'react';
import { UniswapV3StakerFactory } from '@contracts/index';
import { selector, selectorFamily, useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import { accountState } from '@service/account';
import { getPastIncentivesOfPool, computeIncentiveKey } from './';
import { VSTTokenContract } from '@contracts/index';
import { sendTransaction } from '@service/account';
import { getRecoil } from 'recoil-nexus';
import { positionQueryByTokenId, positionsQueryByTokenIds,PositionForUI } from '@service/position';
import { usePoolList } from '@service/farming/index';
import { getCurrentIncentiveIndex, IncentiveKey, getCurrentIncentiveKey } from '@service/farming';
import { fetchMulticall } from '@contracts/index';

export interface FarmingPosition extends PositionForUI {
  isActive:boolean; //whether the incentive status of this position is active,that is when the incentive that you are in is your current incentive, it is true.
  whichIncentiveTokenIn:IncentiveKey
  claimable?:number
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

    let tokenIds =
      (
        await fetchMulticall(
          Array.from({ length }).map((_, i) => [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('tokenIds', [account, i])])
        )
      )?.map((r) => UniswapV3StakerFactory.func.interface.decodeFunctionResult('tokenIds', r)[0]) || [];
    tokenIds=[...new Set(tokenIds)] 
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
      let res: { index: number; incentive: IncentiveKey; incentiveId: string } = null!; // TODO: Not sure if null is possible
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

/**
 * Get rewardInfo of multiple positions
 */
// const rewardInfosSeletor = selectorFamily({
//   key: `rewardInfos-${import.meta.env.MODE}`,
//   get:
//     (params) =>
//     async ({ }) => {
//       console.info('params',params)
//       if(params&&params?.positions.length==0) return []
//       const rewardInfos=(
//         await fetchMulticall(
//           params.positions.map((position, i) => {
//             const key=position.isActive?getCurrentIncentiveKey(position.address):position.whichIncentiveTokenIn
//             return [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('getRewardInfo', [key, position.id,params.pid])]
//           })
//         )
//       )?.map((r) => UniswapV3StakerFactory.func.interface.decodeFunctionResult('getRewardInfo', r)[0]) || [];
//       const rewardInfos=[]
//       console.info('rewardInfos',rewardInfos)
//       return rewardInfos
//     },
// });





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
      _position.whichIncentiveTokenIn=whichIncentiveTokenIn.incentive
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
export const handleClaimUnStake = async ({
  isActive,
  key,
  tokenId,
  pid,
  accountAddress,
}: {
  isActive: boolean;
  key: IncentiveKey;
  tokenId: number;
  pid: number;
  accountAddress: string;
}) => {
  const methodName = isActive ? 'unstakeToken' : 'unstakeTokenAtEnd';
  const data0 = UniswapV3StakerFactory.func.interface.encodeFunctionData(methodName, [key, tokenId, pid]);
  const data1 = UniswapV3StakerFactory.func.interface.encodeFunctionData('claimReward', [VSTTokenContract.address, accountAddress, 0]);
  const data2 = UniswapV3StakerFactory.func.interface.encodeFunctionData('withdrawToken', [tokenId, accountAddress]);
  return await sendTransaction({
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
export const handleClaimAndReStake = async ({
  isActive,
  keyThatTokenIdIn,
  currentIncentiveKey,
  tokenId,
  pid,
  accountAddress,
}: {
  isActive: boolean;
  keyThatTokenIdIn: IncentiveKey;
  currentIncentiveKey: IncentiveKey;
  tokenId: number;
  pid: number;
  accountAddress: string;
}) => {
  const methodName = isActive ? 'unstakeToken' : 'unstakeTokenAtEnd';
  const data0 = UniswapV3StakerFactory.func.interface.encodeFunctionData(methodName, [keyThatTokenIdIn, tokenId, pid]);
  const data1 = UniswapV3StakerFactory.func.interface.encodeFunctionData('claimReward', [VSTTokenContract.address, accountAddress, 0]);
  const data2 = UniswapV3StakerFactory.func.interface.encodeFunctionData('stakeToken', [currentIncentiveKey, tokenId, pid]);
  return await sendTransaction({
    to: UniswapV3StakerFactory.address,
    data: UniswapV3StakerFactory.func.interface.encodeFunctionData('multicall', [[data0, data1, data2]]),
  });
};

export const getwhichIncentiveTokenIdIn = (tokenId: number) => getRecoil(whichIncentiveTokenIdInState(+tokenId));

export const useWhichIncentiveTokenIdIn = (tokenId: number) => useRecoilValue(whichIncentiveTokenIdInState(+tokenId));


export const useStakedPositions = () => useRecoilValue(stakedPositionsQuery);
export const useRefreshStakedPositions = () => useRecoilRefresher_UNSTABLE(stakedPositionsQuery);

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

export const useCalcRewards=(positionList:Array<FarmingPosition>,pid:number)=>{
  const [positionsTotalReward, setPositionsTotalReward] = useState<number>(0);
  const [rewardList,setRewardList]=useState<Array<number>>([])
  if(positionList.length==0) return {}
  let rewards=0
  useEffect(()=>{
    async function main(positions:Array<FarmingPosition>,pid:number){
      (
        await fetchMulticall(
          positions.map((position, i) => {
            const key=position.isActive?getCurrentIncentiveKey(position.address):position.whichIncentiveTokenIn
            return [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('getRewardInfo', [key, position.id,pid])]
          })
        )
      )?.map((r,i) => {
        const claimable=UniswapV3StakerFactory.func.interface.decodeFunctionResult('getRewardInfo', r)[0]
        rewardList.push(Number(claimable))
        rewards+=Number(claimable)
        positions[i].claimable=claimable
      }) || [];
      setPositionsTotalReward(rewards)
      setRewardList(rewardList)
    }
    const _positions=JSON.parse(JSON.stringify(positionList))
    main(_positions,pid)
  },[positionList.toString(),pid])
  return {
    positionsTotalReward,rewardList
  }
}
