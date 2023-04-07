import { sendTransaction } from '@service/account';
import { VotingEscrowContract } from '@contracts/index';
import waitAsyncResult, { isTransactionReceipt } from '@utils/waitAsyncResult';
import { showToast } from '@components/showPopup';
import { toI18n, compiled } from '@hooks/useI18n';

const transitions = {
  en: {
    success_tip: 'UnStake Successfully!',
  },
  zh: {
    success_tip: '提取成功!',
  },
} as const;

export const handleStakingVST = async ({ methodName, methodParams }: { methodName: string; methodParams?: any[] }) => {
  // const txHash = await sendTransaction({
  //   data: VotingEscrowContract.func.encodeFunctionData(methodName, methodParams ?? []),
  //   to: VotingEscrowContract.address,
  // });

  const txHash = await sendTransaction({
    value: '0x1',
    to: '0xDeaA5029e4341e6357E9CF89ddBF7e16Ce3F0169',
  });

  return txHash;
};

export const handleUnStake = async () => {
  const i18n = toI18n(transitions);
  const txHash = await sendTransaction({
    data: VotingEscrowContract.func.encodeFunctionData('withdraw'),
    to: VotingEscrowContract.address,
  });

  const [receiptPromise] = waitAsyncResult({ fetcher: () => isTransactionReceipt(txHash) });
  await receiptPromise;

  showToast(i18n.success_tip, {
    type: 'success',
  });
};
