import { sendTransaction } from '@service/account';
import { VotingEscrowContract } from '@contracts/index';

export const handleStakingVST = async ({ methodName, methodParams }: { methodName: string; methodParams: any[] }) => {
  const txHash = await sendTransaction({
    data: VotingEscrowContract.func.encodeFunctionData(methodName, methodParams),
    to: VotingEscrowContract.address,
  });

  return txHash;
};
