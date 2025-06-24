import { useMemo, useState } from 'react';
import { selector, selectorFamily, useRecoilValue, useRecoilValue_TRANSITION_SUPPORT_UNSTABLE, useRecoilRefresher_UNSTABLE } from 'recoil';
import { accountState, sendTransaction } from '@service/account';
import { getPastIncentivesOfPool, computeIncentiveKey, getLRToken } from './';
import { getRecoil } from 'recoil-nexus';
import { enhancePositionForUI, positionQueryByTokenId, positionsQueryByTokenIds, type PositionForUI } from '@service/position';
import { getCurrentIncentiveIndex, IncentiveKey, getCurrentIncentiveKey, poolsInfoQuery } from '@service/farming';
import { fetchMulticall, NonfungiblePositionManager, UniswapV3Staker } from '@contracts/index';
import { useTokenPrice, type Pool, fetchPools } from '@service/pairs&pool';
import * as _ from 'lodash-es';
import { poolState, generatePoolKey } from '@service/pairs&pool/singlePool';
import { decodePosition } from '@service/position/positions';
import Decimal from 'decimal.js';
import { TokenVST, type Token } from '@service/tokens';

export interface FarmingPosition extends PositionForUI {
  isActive: boolean; //whether the incentive status of this position is active,that is when the incentive that you are in is your current incentive, it is true.
  whichIncentiveTokenIn?: IncentiveKey;
  claimable?: number;
}

export interface MyFarmsPositionType {
  liquidity: any; // position liquidity
  isActive: boolean; // position is active or ended
  incentiveKey: IncentiveKey;
  whichIncentiveTokenIn: IncentiveKey;
  incentiveHistoryIndex: number;
  incentiveId: string;
  tokenId: number; // position id
  address: string; // position address, the same as pool address
  position: PositionForUI;
  claimable: string; // position claimable
  token0: Token;
  token1: Token;
  totalAmount0: Decimal;
  totalAmount1: Decimal;
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

      if (Array.isArray(positionsResult)) {
        return await Promise.all(
          positionsResult?.map(async (singleRes, index) => {
            const decodeRes = NonfungiblePositionManager.func.interface.decodeFunctionResult('positions', singleRes);
            const position = await decodePosition(tokenIds[index], decodeRes);

            return position;
          })
        );
      }

      return [];
    },
});

// get tokenIds (positions) of user
const myTokenIdsQuery = selector({
  key: `myTokenIdsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);

    if (!account) return [];

    const length = Number(await UniswapV3Staker.func.tokenIdsLength(account));

    let tokenIds =
      (await fetchMulticall(Array.from({ length }).map((_, i) => [UniswapV3Staker.address, UniswapV3Staker.func.interface.encodeFunctionData('tokenIds', [account, i])])))?.map(
        (r) => UniswapV3Staker.func.interface.decodeFunctionResult('tokenIds', r)[0]
      ) || [];

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
      (await fetchMulticall(tokenIds.map((tokenId) => [UniswapV3Staker.address, UniswapV3Staker.func.interface.encodeFunctionData('deposits', [tokenId])])))
        ?.map((d, i) => (UniswapV3Staker.func.interface.decodeFunctionResult('deposits', d)[1] > 0 ? Number(tokenIds[i]) : null))
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
    return fetchPools(_.uniqBy(positions, (p: any) => p.address));
  },
});

export const usePools = () => {
  return useRecoilValue_TRANSITION_SUPPORT_UNSTABLE(myFarmsPoolsQuery);
};

export interface GroupedPositions extends PositionForUI {
  positions: MyFarmsPositionType[];
  totalAmount0: Decimal;
  totalAmount1: Decimal;
  totalClaimable: Decimal;
  pid: number;
  totalLiquidity: Decimal;
  token0Price: Decimal;
  token1Price: Decimal;
}

const groupPositions = (positions: MyFarmsPositionType[]): GroupedPositions[] => {
  const groupedData: {
    [key: string]: {
      positions: MyFarmsPositionType[];
      totalAmount0: Decimal;
      totalAmount1: Decimal;
      totalClaimable: Decimal;
    } extends Pool
      ? Pool
      : any;
  } = {};

  for (let i = 0, len = positions.length; i < len; i++) {
    const p = positions[i];

    if (groupedData[p.address]) {
      groupedData[p.address].positions.push(p);
    } else {
      groupedData[p.address] = {
        ...p.position.pool,
        positions: [p],
        totalAmount0: new Decimal(0),
        totalAmount1: new Decimal(0),
        totalClaimable: new Decimal(0),
      };
    }

    const [leftToken, rightToken] = getLRToken(groupedData[p.address]?.token0, groupedData[p.address].token1);

    groupedData[p.address].totalAmount0 = groupedData[p.address].totalAmount0.add(p.position.amount0?.toDecimal() || 0);
    groupedData[p.address].totalAmount1 = groupedData[p.address].totalAmount1.add(p.position.amount1?.toDecimal() || 0);
    groupedData[p.address].totalClaimable = groupedData[p.address].totalClaimable.add(p.claimable || 0);
    groupedData[p.address].leftToken = leftToken;
    groupedData[p.address].rightToken = rightToken;
  }

  return Object.values(groupedData);
};

const myFarmsListQuery = selector({
  key: `myFarmsListQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const pools = get(poolsInfoQuery);
    if (pools.length == 0) return { active: [], ended: [] };
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
        return [UniswapV3Staker.address, UniswapV3Staker.func.interface.encodeFunctionData('stakes', [i.tokenId, i.incentiveId])];
      })
    );

    const resOfMulticall =
      multicallOfStakes
        ?.map((m, i) => {
          const [, liquidity] = UniswapV3Staker.func.interface.decodeFunctionResult('stakes', m);
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
          UniswapV3Staker.address,
          UniswapV3Staker.func.interface.encodeFunctionData('getRewardInfo', [r.isActive ? getCurrentIncentiveKey(r.address) : r.incentiveKey, r.tokenId, r.position.pool.pid]),
        ];
      })
    );

    const resOfMulticallOfRewards =
      multicallOfRewards?.map((m) => {
        const [reward] = UniswapV3Staker.func.interface.decodeFunctionResult('getRewardInfo', m);
        return reward;
      }) || [];

    let result: {
      active: MyFarmsPositionType[];
      ended: MyFarmsPositionType[];
    } = resOfMulticall.reduce(
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

    return {
      active: groupPositions(result.active),
      ended: groupPositions(result.ended),
    };
  },
});

const usePrice = (tokens: string[]) => {
  const [price, setPrice] = useState<{
    [key: string]: string;
  } | null>(null);

  const priceMap: {
    [key: string]: string;
  } = {};

  for (const address of tokens) {
    const p = useTokenPrice(address);
    if (p) {
      priceMap[address] = p;
    }
  }

  if (tokens.every((t) => !!priceMap[t])) {
    !price && setPrice(priceMap);
  }

  return price;
};

export const useMyFarmsList = () => {
  // must get pools first
  usePools();

  const list = useRecoilValue_TRANSITION_SUPPORT_UNSTABLE(myFarmsListQuery);
  return list;
  // console.info('list',list)
  // const [listWithPrice, setListWithPrice] = useState<{
  //   active: GroupedPositions[];
  //   ended: GroupedPositions[];
  // } | null>(null);

  // const tokensMap: {
  //   [key: string]: true;
  // } = {
  //   [VSTTokenContract.address]: true,
  // };

  // list.active.concat(list.ended).forEach((p) => {
  //   tokensMap[p.token0.address] = true;
  //   tokensMap[p.token1.address] = true;
  // });

  // const tokensArr = Object.keys(tokensMap);

  // const priceMap = usePrice(tokensArr);
  // if (priceMap) {
  //   const l = {
  //     active: list.active.map((p) => {
  //       const token0Price = priceMap[p.token0.address];
  //       const token1Price = priceMap[p.token1.address];

  //       return {
  //         ...p,
  //         totalLiquidity: p.totalAmount0
  //           .div(10 ** p.token0.decimals)
  //           .mul(token0Price || 0)
  //           .add(p.totalAmount1.div(10 ** p.token1.decimals).mul(token1Price || 0)),
  //         claimableValue: p.totalClaimable.mul(token0Price || 0),
  //         // @ts-ignore
  //         positions: p.positions.map((p) => {
  //           return {
  //             ...p,
  //             totalLiquidity: p?.position?.amount0
  //               ?.div(10 ** p?.position.token0?.decimals)
  //               .mul(token0Price)
  //               .add((p.position.amount1 ? p.position.amount1 : new Unit(0)).div(10 ** p.position.token1?.decimals).mul(token1Price)),
  //           };
  //         }),
  //       };
  //     }),
  //     ended: list.ended.map((p) => {
  //       const token0Price = priceMap[p.token0.address];
  //       const token1Price = priceMap[p.token1.address];

  //       return {
  //         ...p,
  //         totalLiquidity: p.totalAmount0
  //           .div(10 ** p.token0.decimals)
  //           .mul(token0Price || 0)
  //           .add(p.totalAmount1.div(10 ** p.token1.decimals).mul(token1Price || 0)),
  //         claimableValue: p.totalClaimable.mul(token0Price || 0),
  //         // @ts-ignore
  //         positions: p.positions.map((p) => {
  //           return {
  //             ...p,
  //             totalLiquidity: p.position.amount0
  //               ?.div(10 ** p.position.token0.decimals)
  //               .mul(token0Price)
  //               .add(p.position.amount1 ? p.position.amount1.div(10 ** p.position.token1.decimals).mul(token1Price) : 0),
  //           };
  //         }),
  //       };
  //     }),
  //   };

  //   !listWithPrice && setListWithPrice(l);
  // }

  // return listWithPrice || list;
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
      let res: { index: number; incentive: IncentiveKey; incentiveId: string } | null = null;
      for (let index = 0; index < incentives.length; index++) {
        const incentive = incentives[index];
        const incentiveId = computeIncentiveKey(incentive);
        const [, liquidity] = await UniswapV3Staker.func.stakes(tokenId, incentiveId);
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
    const stakedTokenIds = get(stakedTokenIdsQuery);
    const stakedPositions = get(positionsQueryByTokenIds(stakedTokenIds));
    const currentIndex = getCurrentIncentiveIndex();
    const _stakedPositions: Array<FarmingPosition> = [];
    stakedPositions.map((position) => {
      const _position = { ...position } as FarmingPosition;
      const whichIncentiveTokenIn = get(whichIncentiveTokenIdInState(position.id));
      _position.isActive = whichIncentiveTokenIn?.index == currentIndex;
      _position.whichIncentiveTokenIn = whichIncentiveTokenIn?.incentive;
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
  const data0 = UniswapV3Staker.func.interface.encodeFunctionData(methodName, [key, tokenId, pid]);
  const data1 = UniswapV3Staker.func.interface.encodeFunctionData('claimReward', [TokenVST.address, accountAddress, 0]);
  const data2 = UniswapV3Staker.func.interface.encodeFunctionData('withdrawToken', [tokenId, accountAddress]);
  return await sendTransaction({
    to: UniswapV3Staker.address,
    data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [[data0, data1, data2]]),
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
  const data0 = UniswapV3Staker.func.interface.encodeFunctionData(methodName, [keyThatTokenIdIn, tokenId, pid]);
  const data1 = UniswapV3Staker.func.interface.encodeFunctionData('claimReward', [TokenVST.address, accountAddress, 0]);
  const data2 = UniswapV3Staker.func.interface.encodeFunctionData('stakeToken', [currentIncentiveKey, tokenId, pid]);
  return await sendTransaction({
    to: UniswapV3Staker.address,
    data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [[data0, data1, data2]]),
  });
};

export const getwhichIncentiveTokenIdIn = (tokenId: number) => getRecoil(whichIncentiveTokenIdInState(+tokenId));

export const useWhichIncentiveTokenIdIn = (tokenId: number) => useRecoilValue(whichIncentiveTokenIdInState(+tokenId));

export const useStakedPositions = () => useRecoilValue(stakedPositionsQuery);
export const useRefreshStakedTokenIds = () => useRecoilRefresher_UNSTABLE(stakedTokenIdsQuery);
export const useRefreshMyFarmsListQuery = () => useRecoilRefresher_UNSTABLE(myFarmsListQuery);

export const useStakedPositionsByPool = (poolAddress: string, isActive: boolean) => {
  const stakedPositions = useStakedPositions();
  const positions = useMemo(() => stakedPositions.filter((position) => position.address == poolAddress && position.isActive == isActive), [stakedPositions]);
  return positions;
};

export const useIsPositionActive = (tokenId: number) => {
  const whichIncentiveTokenIDIn = useWhichIncentiveTokenIdIn(tokenId);
  return useMemo(() => {
    return whichIncentiveTokenIDIn?.index == getCurrentIncentiveIndex();
  }, [tokenId.toString()]);
};

// export const useCalcRewards = (positionList: Array<FarmingPosition>, pid: number) => {
//   const [positionsTotalReward, setPositionsTotalReward] = useState<number>(0);
//   const [rewardList, setRewardList] = useState<Array<number>>([]);
//   if (positionList.length == 0) return {};
//   let rewards = 0;
//   useEffect(() => {
//     async function main(positions: Array<FarmingPosition>, pid: number) {
//       (
//         await fetchMulticall(
//           positions.map((position, i) => {
//             const key = position.isActive ? getCurrentIncentiveKey(position.address) : position.whichIncentiveTokenIn;
//             return [UniswapV3Staker.address, UniswapV3Staker.func.interface.encodeFunctionData('getRewardInfo', [key, position.id, pid])];
//           })
//         )
//       )?.map((r, i) => {
//         const claimable = UniswapV3Staker.func.interface.decodeFunctionResult('getRewardInfo', r)[0];
//         rewardList.push(Number(claimable));
//         rewards += Number(claimable);
//         positions[i].claimable = claimable;
//       }) || [];
//       setPositionsTotalReward(rewards);
//       setRewardList(rewardList);
//     }
//     const _positions = JSON.parse(JSON.stringify(positionList));
//     main(_positions, pid);
//   }, [positionList.toString(), pid]);
//   return {
//     positionsTotalReward,
//     rewardList,
//   };
// };

export const useCalcTotalLiquidity = (positions: Array<MyFarmsPositionType>, token0Price: string, token1Price: string) => {
  return useMemo(() => {
    if (!!positions.length && token0Price !== '0' && token1Price !== '0') {
      let total = new Decimal(0);
      positions.map((p) => {
        const positionLiquidity = calcPositionLiquidity(p, token0Price, token1Price);
        total = total.add(positionLiquidity);
      });
      return total;
    } else {
      return new Decimal(0);
    }
  }, [positions, token0Price, token1Price]);
};

export const calcPositionLiquidity = (_position: MyFarmsPositionType, token0Price: string, token1Price: string) => {
  const position = _position.position;
  const token0Total = new Decimal(position.amount0?.toDecimalStandardUnit(undefined, position.token0.decimals) || 0).mul(token0Price || 0);
  const token1Total = new Decimal(position.amount1?.toDecimalStandardUnit(undefined, position.token1.decimals) || 0).mul(token1Price || 0);
  return token0Total.add(token1Total);
};
