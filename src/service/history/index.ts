import { useEffect } from 'react';
import { atom, useRecoilState } from 'recoil';
import { setRecoil } from 'recoil-nexus';
import { persistAtomWithDefault } from '@utils/recoilUtils';
import waitAsyncResult, { isTransactionReceipt } from '@utils/waitAsyncResult';
import { useRefreshData, RefreshTypeMap } from '@modules/Navbar/AccountDetailDropdown/History';

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
    | 'Stake_CreateLock'
    | 'Stake_IncreaseUnlockTime'
    | 'Stake_IncreaseAmount'
    | 'Position_RemoveLiquidity'
    | 'AllFarms_StakedLP';
  tokenA_Address?: string;
  tokenA_Value?: string;
  tokenB_Address?: string;
  tokenB_Value?: string;
}

const historyState = atom<Array<HistoryRecord>>({
  key: `historyState-${import.meta.env.MODE}`,
  effects: [persistAtomWithDefault([])],
});

let inHistoryTracking = false;
const recordTracker = new Map<string, boolean>();
export const useHistory = () => {
  const [history, setHistory] = useRecoilState(historyState);
  const refreshFuncs = useRefreshData();

  useEffect(() => {
    if (inHistoryTracking) return;
    inHistoryTracking = true;
    history
      .filter((record) => record.status === HistoryStatus.Pending)
      .forEach((record) => {
        if (recordTracker.has(record.txHash)) return;
        const [receiptPromise] = waitAsyncResult({ fetcher: () => isTransactionReceipt(record.txHash) });
        recordTracker.set(record.txHash, true);
        receiptPromise.then((receipt) => {
          setHistory((pre) => pre.map((r) => (r.txHash === record.txHash ? { ...r, status: receipt.status === '0x1' ? HistoryStatus.Success : HistoryStatus.Failed } : r)));
          recordTracker.delete(record.txHash);

          // refresh the corresponding data
          const refreshFuncsKeyShouldRun = RefreshTypeMap[record?.type];
          const refreshFuncsShouldRun: VoidFunction[] = [];
          if (typeof refreshFuncsKeyShouldRun === 'string') {
            refreshFuncsShouldRun.push(refreshFuncs[refreshFuncsKeyShouldRun]);
          } else {
            refreshFuncsKeyShouldRun.forEach((key) => {
              refreshFuncsShouldRun.push(refreshFuncs[key]);
            });
          }
          refreshFuncsShouldRun.forEach((func) => func());
        });
      });

    return () => {
      inHistoryTracking = false;
    };
  }, [history]);
  return history ?? [];
};

export const addRecordToHistory = (record: Omit<HistoryRecord, 'status'>) =>
  setRecoil(historyState, (history) => {
    const hasSame = !!history.some((r) => r.txHash === record.txHash);
    if (hasSame) return history;
    return [{ ...record, status: HistoryStatus.Pending }, ...history];
  });

export const clearHistory = () => {
  setRecoil(historyState, []);
};
