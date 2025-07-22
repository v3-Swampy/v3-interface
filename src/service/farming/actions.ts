import { UniswapV3Staker } from '@contracts/index';
import { sendTransaction } from '@service/account';
import { type IncentiveKeyDetail, type Rewards } from '@service/farming';
import { hidePopup } from '@components/showPopup';
import showGasLimitModal from '@modules/ConfirmTransactionModal/showGasLimitModal';

export const handleStakeLP = async ({ VSTIncentiveKey, tokenId }: { VSTIncentiveKey: IncentiveKeyDetail; tokenId: number; }) => {
  try {
    const key = [VSTIncentiveKey.rewardToken, VSTIncentiveKey.poolAddress, VSTIncentiveKey.startTime, VSTIncentiveKey.endTime, VSTIncentiveKey.refundee];
    const data0 = UniswapV3Staker.func.interface.encodeFunctionData('depositToken', [tokenId]);
    const data1 = UniswapV3Staker.func.interface.encodeFunctionData('stakeToken', [key, tokenId]);
    return await sendTransaction({
      to: UniswapV3Staker.address,
      data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [[data0, data1]]),
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
  VSTIncentiveKey,
  tokenId,
  accountAddress,
  rewards,
}: {
  VSTIncentiveKey: IncentiveKeyDetail;
  rewards: Rewards;
  tokenId: number;
  accountAddress: string;
}) => {
  const key = [VSTIncentiveKey.rewardToken, VSTIncentiveKey.poolAddress, VSTIncentiveKey.startTime, VSTIncentiveKey.endTime, VSTIncentiveKey.refundee];
  const data0 = UniswapV3Staker.func.interface.encodeFunctionData('unstakeToken', [key, tokenId]);
  const claimRewardData = rewards.map((reward) => UniswapV3Staker.func.interface.encodeFunctionData('claimReward', [reward.rewardTokenInfo?.address, accountAddress, reward.stakeReward.unsettledReward]));
  const data2 = UniswapV3Staker.func.interface.encodeFunctionData('stakeToken', [key, tokenId]);

  return await sendTransaction({
    to: UniswapV3Staker.address,
    data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [[data0, ...claimRewardData, data2]]),
  });
};


export const handleUnstake = async ({
  VSTIncentiveKey,
  rewards,
  tokenId,
  accountAddress,
}: {
  VSTIncentiveKey: IncentiveKeyDetail;
  rewards: Rewards;
  tokenId: number;
  accountAddress: string;
}) => {
  const key = [VSTIncentiveKey.rewardToken, VSTIncentiveKey.poolAddress, VSTIncentiveKey.startTime, VSTIncentiveKey.endTime, VSTIncentiveKey.refundee];
  const data0 = UniswapV3Staker.func.interface.encodeFunctionData('unstakeToken', [key, tokenId]);
  const claimRewardData = rewards.map((reward) => UniswapV3Staker.func.interface.encodeFunctionData('claimReward', [reward.rewardTokenInfo?.address, accountAddress, reward.stakeReward.unsettledReward]));
  const data2 = UniswapV3Staker.func.interface.encodeFunctionData('withdrawToken', [tokenId, accountAddress]);

  return await sendTransaction({
    to: UniswapV3Staker.address,
    data: UniswapV3Staker.func.interface.encodeFunctionData('multicall', [[data0, ...claimRewardData, data2]]),
  });
};
