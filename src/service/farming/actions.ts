import { UniswapV3Staker } from '@contracts/index';
import { sendTransaction } from '@service/account';
import { type IncentiveKeyDetail, type Rewards } from '@service/farming';
import { hidePopup } from '@components/showPopup';
import showGasLimitModal from '@modules/ConfirmTransactionModal/showGasLimitModal';

export const handleStakeLP = async ({ activeIncentiveKeys, tokenId }: { activeIncentiveKeys: IncentiveKeyDetail[]; tokenId: number; }) => {
  try {
    const data0 = UniswapV3Staker.func.interface.encodeFunctionData('depositToken', [tokenId]);
    const stakeData = activeIncentiveKeys.map((key) => UniswapV3Staker.func.interface.encodeFunctionData('stakeToken', [[key.rewardToken, key.poolAddress, key.startTime, key.endTime, key.refundee], tokenId]));
    return await sendTransaction({
      to: UniswapV3Staker.address,
      data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [[data0, ...stakeData]]),
    });
  } catch (err: any) {
    if (err?.code === -32603) {
      hidePopup();
      setTimeout(() => {
        showGasLimitModal();
      }, 400);
    }
  }
};

export const handleClaim = async ({
  stakedIncentiveKeys,
  rewards,
  tokenId,
  accountAddress,
  activeIncentiveKeys,
}: {
  stakedIncentiveKeys: IncentiveKeyDetail[];
  activeIncentiveKeys: IncentiveKeyDetail[];
  rewards: Rewards;
  tokenId: number;
  accountAddress: string;
}) => {
  const unstakeData = stakedIncentiveKeys.map((key) => UniswapV3Staker.func.interface.encodeFunctionData('unstakeToken', [[key.rewardToken, key.poolAddress, key.startTime, key.endTime, key.refundee], tokenId]));
  const claimRewardData = rewards.map((reward) => UniswapV3Staker.func.interface.encodeFunctionData('claimReward', [reward.rewardTokenInfo!.address, accountAddress, 0]));
  const stakeData = activeIncentiveKeys.map((key) => UniswapV3Staker.func.interface.encodeFunctionData('stakeToken', [[key.rewardToken, key.poolAddress, key.startTime, key.endTime, key.refundee], tokenId]));

  return await sendTransaction({
    to: UniswapV3Staker.address,
    data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [[...unstakeData, ...claimRewardData, ...stakeData]]),
  });
};


export const handleUnstake = async ({
  stakedIncentiveKeys,
  rewards,
  tokenId,
  accountAddress,
}: {
  stakedIncentiveKeys: IncentiveKeyDetail[];
  rewards: Rewards;
  tokenId: number;
  accountAddress: string;
}) => {
  const unstakeData = stakedIncentiveKeys.map((key) => UniswapV3Staker.func.interface.encodeFunctionData('unstakeToken', [[key.rewardToken, key.poolAddress, key.startTime, key.endTime, key.refundee], tokenId]));
  const claimRewardData = rewards.map((reward) => UniswapV3Staker.func.interface.encodeFunctionData('claimReward', [reward.rewardTokenInfo?.address, accountAddress, 0]));
  const withdrawData = UniswapV3Staker.func.interface.encodeFunctionData('withdrawToken', [tokenId, accountAddress]);

  return await sendTransaction({
    to: UniswapV3Staker.address,
    data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [[...unstakeData, ...claimRewardData, withdrawData]]),
  });
};
