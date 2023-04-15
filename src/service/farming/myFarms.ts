import { fetchMulticall, UniswapV3StakerFactory } from '@contracts/index';
import { selector,  selectorFamily } from 'recoil';
import { accountState } from '@service/account';
import { getPosition } from '@service/pool-manage';
import { getPastIncentivesOfPool } from './';
import { keccak256 } from '@ethersproject/solidity';
import { defaultAbiCoder } from '@ethersproject/abi';

/**
 * Get the staked token id of user
 */
const stakedTokenIds = selector({
  key: `stakedTokenIds-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const stakedTokenIds = [];
    const account = get(accountState);
    if (!account) return undefined;
    const response = await UniswapV3StakerFactory.func.tokenIdsLength(account);
    const tokenIdsLength = Number(response.toString());
    if (tokenIdsLength == 0) return [];
    for (let index = 0; index < tokenIdsLength; index++) {
      const tokenId = await UniswapV3StakerFactory.func.tokenIds(account, index);
      const deposits = await UniswapV3StakerFactory.func.deposits(tokenId);
      if (deposits.numberOfStakes > 0) {
        stakedTokenIds.push(tokenId);
      }
    }
    return stakedTokenIds;
  },
});

/**
 * get which incentive the tokenId in
 */
const getWhichIncentiveInfo = selectorFamily({
  key: `whichIncentive-${import.meta.env.MODE}`,
  get: (tokenId: number) => async () => {
    const position = await getPosition(tokenId);
    const incentives = getPastIncentivesOfPool(position?.address);
    let res = {};
    for (let index = 0; index < incentives.length; index++) {
      const incentive = incentives[index];
      const incentiveId = keccak256(['tuple'], [defaultAbiCoder.encode(['tuple'], [incentive])]);
      const [, liquidity] = await UniswapV3StakerFactory.func.stakes(tokenId, incentiveId);
      if (liquidity > 0)
        res = {
          index,
          incentive,
          incentiveId,
        };
      break;
    }
    return res;
  },
});
