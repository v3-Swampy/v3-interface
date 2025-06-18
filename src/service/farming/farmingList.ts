import { atom, useRecoilValue } from 'recoil';
import { setRecoil } from 'recoil-nexus';
import LocalStorage from 'localstorage-enhance';
import { isEqual } from 'lodash-es';
import waitAsyncResult from '@utils/waitAsyncResult';
import { handleRecoilInit } from '@utils/recoilUtils';

export interface Incentive {
  startTime: number;
  endTime: number;
  amount: number;
}

const farmingsKey = `farmingState-${import.meta.env.MODE}`;
const incentiveHistoryKey = `farmingIncentiveState-${import.meta.env.MODE}`;

let resolveFarmingInit: (value: unknown) => void = null!;
export const farmingInitPromise = new Promise((resolve) => {
  resolveFarmingInit = resolve;
});

const cachedFarmings = (LocalStorage.getItem(farmingsKey, 'farming') as { pids: Array<number> }) ?? { pids: [] };
const cachedIncentiveHistory = (LocalStorage.getItem(incentiveHistoryKey, 'farming') as Array<Incentive>) ?? [];
if (cachedFarmings?.pids?.length) {
  resolveFarmingInit(true);
}

export const farmingsState = atom<{ pids: Array<number> }>({
  key: farmingsKey,
  default: cachedFarmings,
});

export const useFarmingsPids = () => {
  const { pids } = useRecoilValue(farmingsState);
  return pids;
};

export const incentiveHistoryState = atom<Array<Incentive>>({
  key: incentiveHistoryKey,
  default: cachedIncentiveHistory,
});

export const useincentiveHistory = () => {
  return useRecoilValue(incentiveHistoryState);
};

export const poolIds = cachedFarmings.pids;
export const incentiveHistory = cachedIncentiveHistory;

// init farming data;
(async function () {
  const farmingsURL = `${import.meta.env.VITE_FarmingConfigUrl}`;
  try {
    const [p] = waitAsyncResult({
      fetcher: (): Promise<{ incentive_history: Array<Incentive>; farmings: { pids: Array<number> } }> => fetch(farmingsURL).then((res) => res.json()),
    });
    const { incentive_history, farmings } = await p;

    if (isEqual(farmings, cachedFarmings) && isEqual(incentive_history, cachedIncentiveHistory)) return;
    try {
      LocalStorage.setItem({ key: farmingsKey, data: farmings, namespace: 'farming' });
      LocalStorage.setItem({ key: incentiveHistoryKey, data: incentive_history, namespace: 'farming' });
      handleRecoilInit((set) => {
        set(farmingsState, farmings);
        set(incentiveHistoryState, incentive_history);
      });
    } catch (_) {
      setRecoil(farmingsState, farmings);
      setRecoil(incentiveHistoryState, incentive_history);
    } finally {
      resolveFarmingInit(true);
      window.location.reload();
    }
  } catch (err) {
    console.error('Failed to get the latest farming data: ', err);
  }
})();
