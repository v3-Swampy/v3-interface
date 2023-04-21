import { useMemo, useState, useEffect } from 'react';
import { selector, selectorFamily, useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import { accountState } from '@service/account';
import { getPastIncentivesOfPool, computeIncentiveKey } from './';
import { sendTransaction } from '@cfxjs/use-wallet-react/ethereum';
import { getRecoil } from 'recoil-nexus';
import { positionQueryByTokenId, positionsQueryByTokenIds, PositionForUI, type Position } from '@service/position';
import { getCurrentIncentiveIndex, IncentiveKey, getCurrentIncentiveKey, usePoolList, poolsQuery } from '@service/farming';
import { fetchMulticall, NonfungiblePositionManager, VSTTokenContract, UniswapV3StakerFactory } from '@contracts/index';
import { fetchPools } from '@service/pairs&pool';
import _ from 'lodash-es';
import { enhancePositionForUI } from '@service/position';
import { poolState, generatePoolKey } from '@service/pairs&pool/singlePool';
import { decodePosition } from '@service/position/positions';

export interface FarmingPosition extends PositionForUI {
  isActive: boolean; //whether the incentive status of this position is active,that is when the incentive that you are in is your current incentive, it is true.
  whichIncentiveTokenIn: IncentiveKey;
  claimable?: number;
}

export const myFarmsPositionsQueryByTokenIds = selectorFamily({
  key: `myFarmsPositionsQueryByTokenIds-${import.meta.env.MODE}`,
  get:
    (tokenIds: Array<number>) =>
    async ({ get }) => {
      if (!tokenIds?.length) return [];

      const positionsResult = await fetchMulticall(
        tokenIds.map((id) => [NonfungiblePositionManager.address, NonfungiblePositionManager.func.interface.encodeFunctionData('positions', [id])])
      );

      if (Array.isArray(positionsResult))
        return positionsResult?.map((singleRes, index) => {
          const decodeRes = NonfungiblePositionManager.func.interface.decodeFunctionResult('positions', singleRes);
          const position: Position = decodePosition(tokenIds[index], decodeRes);

          return position;
        });
      return [];
    },
});

// get tokenIds (positions) of user
const myTokenIdsQuery = selector({
  key: `myTokenIdsQuery-${import.meta.env.MODE}`,
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

    tokenIds = [...new Set(tokenIds)];

    return tokenIds;
  },
});

/**
 * Get the staked tokenIds (positions) of user
 */
const stakedTokenIdsQuery = selector({
  key: `stakedTokenIdsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);

    if (!account) return [];

    const tokenIds = get(myTokenIdsQuery);

    const stakedTokenIds =
      (await fetchMulticall(tokenIds.map((tokenId) => [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('deposits', [tokenId])])))
        ?.map((d, i) => (UniswapV3StakerFactory.func.interface.decodeFunctionResult('deposits', d)[1] > 0 ? Number(tokenIds[i]) : null))
        .filter((d) => d !== null) || [];

    return stakedTokenIds as number[];
  },
});

const myFarmsPositionsQuery = selector({
  key: `myFarmsPositionsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const stakedTokenIds = get(stakedTokenIdsQuery);
    const positions = get(myFarmsPositionsQueryByTokenIds(stakedTokenIds));
    return positions;
  },
});

const myFarmsPoolsQuery = selector({
  key: `myFarmsPoolsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const positions = get(myFarmsPositionsQuery);
    return fetchPools(_.uniqBy(positions, (p) => p.address));
  },
});

export const usePools = () => {
  return useRecoilValue(myFarmsPoolsQuery);
};

const myFarmsListQuery = selector({
  key: `myFarmsListQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const pools = get(poolsQuery);

    const positions = get(myFarmsPositionsQuery).map((position) => {
      const { token0, token1, fee } = position;
      const pool = get(poolState(generatePoolKey({ tokenA: token0, tokenB: token1, fee })));
      return enhancePositionForUI(position, pool);
    });

    const currentIndex = getCurrentIncentiveIndex();

    const incentiveKeysOfAllPositions = positions
      .map((p) => {
        return getPastIncentivesOfPool(p.address).map((k, i) => ({
          incentiveKey: k,
          incentiveId: computeIncentiveKey(k),
          tokenId: p.id,
          incentiveHistoryIndex: i,
          address: p.address,
          position: {
            ...p,
            pool: {
              ...p.pool,
              pid: pools.find((p1) => p1.address === p.address)?.pid,
            },
          },
        }));
      })
      .flat();

    const multicallOfStakes = await fetchMulticall(
      incentiveKeysOfAllPositions.map((i) => {
        return [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('stakes', [i.tokenId, i.incentiveId])];
      })
    );

    const resOfMulticall =
      multicallOfStakes
        ?.map((m, i) => {
          const [, liquidity] = UniswapV3StakerFactory.func.interface.decodeFunctionResult('stakes', m);
          const position = incentiveKeysOfAllPositions[i];

          return {
            ...position,
            liquidity,
            isActive: position.incentiveHistoryIndex === currentIndex,
            whichIncentiveTokenIn: position.incentiveKey,
          };
        })
        .filter((r) => r.liquidity > 0) || [];

    const multicallOfRewards = await fetchMulticall(
      resOfMulticall.map((r) => {
        return [
          UniswapV3StakerFactory.address,
          UniswapV3StakerFactory.func.interface.encodeFunctionData('getRewardInfo', [
            r.isActive ? getCurrentIncentiveKey(r.address) : r.incentiveKey,
            r.tokenId,
            r.position.pool.pid,
          ]),
        ];
      })
    );

    const resOfMulticallOfRewards =
      multicallOfRewards?.map((m) => {
        const [reward] = UniswapV3StakerFactory.func.interface.decodeFunctionResult('getRewardInfo', m);
        return reward;
      }) || [];

    // console.log('resOfMulticallOfRewards: ', resOfMulticallOfRewards);

    const result: {
      liquidity: any; // position liquidity
      isActive: boolean; // position is active or ended
      incentiveKey: IncentiveKey;
      whichIncentiveTokenIn: IncentiveKey;
      incentiveHistoryIndex: number;
      incentiveId: string;
      tokenId: number; // position id
      address: string; // position address, the same as pool address
      position: Position;
      claimable: string; // position claimable
    }[] = resOfMulticall.reduce(
      (prev: any, curr, index) => {
        const r = {
          ...curr,
          claimable: resOfMulticallOfRewards[index].toString(),
        };

        if (r.isActive) {
          prev.active.push(r);
        } else {
          prev.ended.push(r);
        }

        return prev;
      },
      {
        active: [],
        ended: [],
      }
    );

    return result;
  },
});

export const useMyFarmsList = () => {
  return useRecoilValue(myFarmsListQuery);
};

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
    const stakedTokenIds = get(stakedTokenIdsQuery);
    const stakedPositions = get(positionsQueryByTokenIds(stakedTokenIds));
    const currentIndex = getCurrentIncentiveIndex();
    const _stakedPositions: Array<FarmingPosition> = [];
    stakedPositions.map((position) => {
      const _position = { ...position } as FarmingPosition;
      const whichIncentiveTokenIn = get(whichIncentiveTokenIdInState(position.id));
      _position.isActive = whichIncentiveTokenIn.index == currentIndex;
      _position.whichIncentiveTokenIn = whichIncentiveTokenIn.incentive;
      _stakedPositions.push(_position);
    });
    return _stakedPositions;
  },
});

export const useStakedTokenIds = () => {
  const stakedTokenIds = useRecoilValue(stakedTokenIdsQuery);
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

export const useStakedPositionsByPool = (poolAddress: string, isActive: boolean) => {
  const stakedPostions = useStakedPositions();
  const positions = useMemo(() => stakedPostions.filter((position) => position.address == poolAddress && position.isActive == isActive), [stakedPostions]);
  return positions;
};

export const useIsPositionActive = (tokenId: number) => {
  const whichIncentiveTokenIDIn = useWhichIncentiveTokenIdIn(tokenId);
  return useMemo(() => {
    return whichIncentiveTokenIDIn.index == getCurrentIncentiveIndex();
  }, [tokenId.toString()]);
};

export const useCalcRewards = (positionList: Array<FarmingPosition>, pid: number) => {
  const [positionsTotalReward, setPositionsTotalReward] = useState<number>(0);
  const [rewardList, setRewardList] = useState<Array<number>>([]);
  if (positionList.length == 0) return {};
  let rewards = 0;
  useEffect(() => {
    async function main(positions: Array<FarmingPosition>, pid: number) {
      (
        await fetchMulticall(
          positions.map((position, i) => {
            const key = position.isActive ? getCurrentIncentiveKey(position.address) : position.whichIncentiveTokenIn;
            return [UniswapV3StakerFactory.address, UniswapV3StakerFactory.func.interface.encodeFunctionData('getRewardInfo', [key, position.id, pid])];
          })
        )
      )?.map((r, i) => {
        const claimable = UniswapV3StakerFactory.func.interface.decodeFunctionResult('getRewardInfo', r)[0];
        rewardList.push(Number(claimable));
        rewards += Number(claimable);
        positions[i].claimable = claimable;
      }) || [];
      setPositionsTotalReward(rewards);
      setRewardList(rewardList);
    }
    const _positions = JSON.parse(JSON.stringify(positionList));
    main(_positions, pid);
  }, [positionList.toString(), pid]);
  return {
    positionsTotalReward,
    rewardList,
  };
};
