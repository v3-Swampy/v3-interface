
import { UniswapV3Staker } from '@contracts/index';
import { sendTransaction } from '@service/account';
import { hidePopup } from '@components/showPopup';
import showGasLimitModal from '@modules/ConfirmTransactionModal/showGasLimitModal';
import { type incentiveKey } from './farmingList';


export const handleStakeLP = async ({ incentiveKey, tokenId }: { incentiveKey: incentiveKey; tokenId: number; }) => {
  try {
    const data0 = UniswapV3Staker.func.interface.encodeFunctionData('depositToken', [tokenId]);
    const data1 = UniswapV3Staker.func.interface.encodeFunctionData('stakeToken', [[incentiveKey.rewardToken, incentiveKey.poolAddress, incentiveKey.startTime, incentiveKey.endTime, incentiveKey.refundee], tokenId]);
    
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