import { fetchMulticall, UniswapV3StakerFactory } from '@contracts/index';
import { selector, selectorFamily, useRecoilValue } from 'recoil';
import { accountState } from '@service/account';
import { getPastIncentivesOfPool,computeIncentiveKey } from './';
import { IncentiveKey } from '@uniswap/v3-sdk';
import { VSTTokenContract } from '@contracts/index';
import { sendTransaction } from '@cfxjs/use-wallet-react/ethereum';
import { getRecoil } from 'recoil-nexus';
import { getPosition, positionQueryByTokenId } from '@service/position';

/**
 * Get the staked token id of user
 */
const stakedTokenIdsState = selector({
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
      if (Array.isArray(deposits) && deposits[1] > 0) {
        stakedTokenIds.push(Number(tokenId));
      }
    }
    return stakedTokenIds;
  },
});

/**
 * get which incentive the tokenId in
 */
const whichIncentiveTokenIdInState = selectorFamily({
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

export const useStakedTokenIds = () => {
  const stakedTokenIds = useRecoilValue(stakedTokenIdsState);
  return stakedTokenIds;
};

/**
 * Claim&Unstake for active or ended incentive
 * active incentive: current incentive
 * ended  incentive: the incentive that tokenId in
 */
export const handleClaimAndUnStake = async ({ key, tokenId, pid, accountAddress }: { key: IncentiveKey; tokenId: string; pid: string; accountAddress: string }) => {
  const data0 = UniswapV3StakerFactory.func.interface.encodeFunctionData('unstakeTokenAtEnd', [key, tokenId, pid]);
  const data1 = UniswapV3StakerFactory.func.interface.encodeFunctionData('claimReward', [VSTTokenContract.address, accountAddress, 0]);
  const data2 = UniswapV3StakerFactory.func.interface.encodeFunctionData('withdrawToken', [tokenId, accountAddress]);
  const txHash = await sendTransaction({
    to: UniswapV3StakerFactory.address,
    data: UniswapV3StakerFactory.func.interface.encodeFunctionData('multicall', [[data0, data1, data2]]),
  });
  console.info('handleClaimAndUnStake txHash: ', txHash);
};

/**
 * Claim&Unstake&reStake for active or ended incentive
 * active incentive: current incentive
 * ended  incentive: the incentive that tokenId in
 */
export const handleClaimAndReStake = async ({
  keyThatTokenIdIn,
  currentKey,
  tokenId,
  pid,
  accountAddress,
}: {
  keyThatTokenIdIn: IncentiveKey;
  currentKey: IncentiveKey;
  tokenId: string;
  pid: string;
  accountAddress: string;
}) => {
  const data0 = UniswapV3StakerFactory.func.interface.encodeFunctionData('unstakeTokenAtEnd', [keyThatTokenIdIn, tokenId, pid]);
  const data1 = UniswapV3StakerFactory.func.interface.encodeFunctionData('claimReward', [VSTTokenContract.address, accountAddress, 0]);
  const data2 = UniswapV3StakerFactory.func.interface.encodeFunctionData('stakeToken', [currentKey, tokenId, pid]);
  const txHash = await sendTransaction({
    to: UniswapV3StakerFactory.address,
    data: UniswapV3StakerFactory.func.interface.encodeFunctionData('multicall', [[data0, data1, data2]]),
  });
  console.info('handleClaimAndReStake txHash: ', txHash);
};

export const getwhichIncentiveTokenIdIn = (tokenId: number) => getRecoil(whichIncentiveTokenIdInState(+tokenId));

export const useWhichIncentiveTokenIdIn = (tokenId: number) => useRecoilValue(whichIncentiveTokenIdInState(+tokenId));
