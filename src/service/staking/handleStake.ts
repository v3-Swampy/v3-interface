import { sendTransaction } from '@service/account';
import { VotingEscrowContract } from '@contracts/index';

export const handleStakingVST = async ({ methodName, methodParams }: { methodName: 'createLock' | 'increaseUnlockTime' | 'increaseAmount'; methodParams?: any[] }) => {
  const txHash = await sendTransaction({
    data: VotingEscrowContract.func.interface.encodeFunctionData(methodName, methodParams ?? []),
    to: VotingEscrowContract.address,
  });

  return txHash;
};

export const handleUnStake = async () => {
  const txHash = await sendTransaction({
    data: VotingEscrowContract.func.interface.encodeFunctionData('withdraw'),
    to: VotingEscrowContract.address,
  });
  return txHash;
};
