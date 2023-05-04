import { useEffect, useTransition } from 'react';
import { atomFamily, useRecoilState } from 'recoil';
import { setRecoil } from 'recoil-nexus';
import { showToast } from '@components/showPopup';
import { toI18n, compiled } from '@hooks/useI18n';
import { persistAtomWithDefault } from '@utils/recoilUtils';
import { useAccount, getAccount } from '@service/account';
import { getUnwrapperTokenByAddress } from '@service/tokens';
import { waitTransactionReceipt } from '@utils/waitAsyncResult';
import { useRefreshData, RefreshTypeMap, transitions, TransitionsTypeMap } from '@modules/Navbar/AccountDetailDropdown/History';
import { trimDecimalZeros } from '@utils/numberUtils';

export enum HistoryStatus {
  Pending = 'Pending',
  Success = 'Success',
  Failed = 'Failed',
}

export interface HistoryRecord {
  txHash: string;
  status: HistoryStatus;
  type:
    | 'Swap'
    | 'Position_AddLiquidity'
    | 'Position_CollectFees'
    | 'Position_IncreaseLiquidity'
    | 'Stake_CreateLock'
    | 'Stake_IncreaseUnlockTime'
    | 'Stake_IncreaseAmount'
    | 'Position_RemoveLiquidity'
    | 'AllFarms_StakedLP'
    | 'MyFarms_ClaimAndUnstake'
    | 'MyFarms_ClaimAndStake'
    | 'MyFarms_Claim'
    | 'MyFarms_Unstake'
    | 'Stake_Unlock';
  tokenA_Address?: string;
  tokenA_Value?: string;
  tokenB_Address?: string;
  tokenB_Value?: string;
  refreshParams?: any | Array<any>;
}

const historyState = atomFamily<Array<HistoryRecord>, string>({
  key: `historyState-${import.meta.env.MODE}`,
  effects: [persistAtomWithDefault([])],
});

let inHistoryTracking = false;
const recordTracker = new Map<string, boolean>();
export const useHistory = () => {
  const [_, startTransition] = useTransition();
  const account = useAccount();
  const [history, setHistory] = useRecoilState(historyState(account ?? 'not-login-in'));
  const refreshFuncs = useRefreshData();

  useEffect(() => {
    if (inHistoryTracking) return;
    inHistoryTracking = true;
    history
      .filter((record) => record.status === HistoryStatus.Pending)
      .forEach((record) => {
        if (recordTracker.has(record.txHash)) return;
        const [receiptPromise] = waitTransactionReceipt(record.txHash);
        recordTracker.set(record.txHash, true);
        receiptPromise.then((receipt) => {
          setHistory((pre) => pre.map((r) => (r.txHash === record.txHash ? { ...r, status: receipt.status === '0x1' ? HistoryStatus.Success : HistoryStatus.Failed } : r)));
          recordTracker.delete(record.txHash);

          // refresh the corresponding data
          const refreshFuncsKeyShouldRun = RefreshTypeMap[record?.type];
          const refreshFuncsShouldRun: Function[] = [];
          const refreshParams: any[] = Array.isArray(record.refreshParams) ? record.refreshParams : [record.refreshParams];
          if (typeof refreshFuncsKeyShouldRun === 'string' && refreshFuncs[refreshFuncsKeyShouldRun]) {
            refreshFuncsShouldRun.push(refreshFuncs[refreshFuncsKeyShouldRun]);
          } else if (Array.isArray(refreshFuncsKeyShouldRun)) {
            refreshFuncsKeyShouldRun.forEach((key) => {
              if (key && refreshFuncs[key]) {
                refreshFuncsShouldRun.push(refreshFuncs[key]);
              }
            });
          }
          startTransition(() => {
            refreshFuncsShouldRun.forEach((func, index) => func(refreshParams[index]));
          });

          const i18n = toI18n(transitions);
          const { tokenA_Value, tokenA_Address, tokenB_Address, tokenB_Value } = record;
          const tokenA = getUnwrapperTokenByAddress(tokenA_Address);
          const tokenB = getUnwrapperTokenByAddress(tokenB_Address);
          showToast(
            compiled(i18n[TransitionsTypeMap[record.type]], {
              tokenAValue: !!Number(tokenA_Value) ? trimDecimalZeros(tokenA_Value ? Number(tokenA_Value).toFixed(4) : '') : tokenA_Value ?? '',
              tokenASymbol: tokenA?.symbol ?? '',
              tokenBValue: trimDecimalZeros(tokenB_Value ? Number(tokenB_Value).toFixed(4) : ''),
              tokenBSymbol: tokenB?.symbol ?? '',
            }),
            {
              type: receipt?.status === '0x1' ? 'success' : 'error',
            }
          );
        });
      });

    return () => {
      inHistoryTracking = false;
    };
  }, [history]);
  return history ?? [];
};

export const addRecordToHistory = async (record: Omit<HistoryRecord, 'status'>) => {
  const account = getAccount();
  setRecoil(historyState(account ?? 'not-login-in'), (history) => {
    const hasSame = !!history.some((r) => r.txHash === record.txHash);
    if (hasSame) return history;
    return [{ ...record, status: HistoryStatus.Pending }, ...history];
  });

  const [receiptPromise] = waitTransactionReceipt(record.txHash);
  await receiptPromise;
};

export const clearHistory = () => {
  const account = getAccount();
  setRecoil(historyState(account ?? 'not-login-in'), []);
};
