import { showToast } from '@components/showPopup';
import { sendTransaction } from '@service/account';
import { AutoPositionManager, fetchMulticall, NonfungiblePositionManager } from '@contracts/index';
import { addRecordToHistory } from '@service/history';

const getUserUnstakeLpTokens = async ({ account }: { account: string }) => {
  const positionBalanceRes = await NonfungiblePositionManager.func.balanceOf(account);
  const positionBalance = positionBalanceRes ? Number(positionBalanceRes.toString()) : 0;
  if (!positionBalance) return [];

  const tokenIdsArgs = account && positionBalance && positionBalance > 0 ? Array.from({ length: positionBalance }, (_, index) => [account, index]) : [];

  const tokenIdResults = await fetchMulticall(
    tokenIdsArgs.map((args) => [NonfungiblePositionManager.address, NonfungiblePositionManager.func.interface.encodeFunctionData('tokenOfOwnerByIndex', args)])
  );

  if (Array.isArray(tokenIdResults))
    return tokenIdResults?.map((singleRes) => Number(NonfungiblePositionManager.func.interface.decodeFunctionResult('tokenOfOwnerByIndex', singleRes)?.[0]));
  return [];
};

export const importBetaLp = async ({ account }: { account: string }) => {
  try {
    const tokenIds = await getUserUnstakeLpTokens({ account });
    if (!tokenIds.length) {
      showToast(`You don’t have any Open Beta positions left to import.`, { type: 'warning' });
      return;
    }

    const calldatas = tokenIds.map((tokenId) => NonfungiblePositionManager.func.interface.encodeFunctionData('safeTransferFrom', [account, AutoPositionManager.address, tokenId]));
    const txHash = await sendTransaction({
      to: NonfungiblePositionManager.address,
      data: NonfungiblePositionManager.func.interface.encodeFunctionData('multicall', [calldatas]),
    });
    addRecordToHistory({
      txHash,
      type: 'ImportBetaLP',
    });
    return txHash;
  } catch (error) {
    showToast(`Import Failed: ${(error as Error)?.message ?? 'unknown error'}`, { type: 'error' });
  }
};
