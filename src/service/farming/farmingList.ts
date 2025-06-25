import { atom, selector, useRecoilValue } from 'recoil';
import { setRecoil, getRecoil } from 'recoil-nexus';
import LocalStorage from 'localstorage-enhance';
import { isEqual } from 'lodash-es';
import dayjs from 'dayjs';
import waitAsyncResult from '@utils/waitAsyncResult';
import { handleRecoilInit } from '@utils/recoilUtils';
import { TokenVST } from '@service/tokens';
import { RefundeeContractAddress } from '@contracts/index';

export interface Incentive {
  startTime: number;
  endTime: number;
  amount: number;
}

export interface IncentiveKey {
  rewardToken: string;
  pool: string;
  startTime: number;
  endTime: number;
  refundee: string;
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

export const poolIdsSelector = selector({
  key: `poolIdsSelector-${import.meta.env.MODE}`,
  get: ({ get }) => {
    const { pids } = get(farmingsState);
    return pids;
  },
});

export const incentiveHistoryState = atom<Array<Incentive>>({
  key: incentiveHistoryKey,
  default: cachedIncentiveHistory,
});

const timeTickState = atom<number>({
  key: `timeTickState-${import.meta.env.MODE}`,
  default: Date.now(),
});

export const currentIncentiveSelector = selector({
  key: `currentIncentiveIndexSelector-${import.meta.env.MODE}`,
  get: ({ get }) => {
    const incentiveHistory = get(incentiveHistoryState);
    get(timeTickState);

    const now = dayjs().unix();
    const index = incentiveHistory.findIndex((period) => now >= period.startTime && now <= period.endTime);
    const period = incentiveHistory[index];
    return {
      period,
      index
    }
  },
});

const setupPreciseTimer = (incentiveHistory: Array<Incentive>) => {
  if (!incentiveHistory.length) return;

  const now = Date.now();
  const allTimePoints = incentiveHistory.flatMap(period => [
    period.startTime * 1000,
    period.endTime * 1000
  ]).filter(time => time > now).sort((a, b) => a - b);

  const nextTimePoint = allTimePoints[0];
  if (nextTimePoint) {
    const safeDelay = Math.max(nextTimePoint - now + 3000, 1000);
    
    setTimeout(() => {
      try {
        setRecoil(timeTickState, Date.now());
        setupPreciseTimer(incentiveHistory);
      } catch (error) {
        console.warn('Failed to update time tick:', error);
        setTimeout(() => setupPreciseTimer(incentiveHistory), 5000);
      }
    }, safeDelay);
  }
};

export const useIncentiveHistory = () => useRecoilValue(incentiveHistoryState);
export const useCurrentIncentive = () => useRecoilValue(currentIncentiveSelector);
const getCurrentIncentivePeriod = () => getRecoil(currentIncentiveSelector)?.period;
const getCurrentIncentiveIndex = () => getRecoil(currentIncentiveSelector)?.index;

export const getPastHistory = (index?: number) => {
  const incentiveHistory = getRecoil(incentiveHistoryState);
  const i = index ? index : getCurrentIncentiveIndex();
  const pastHistory = [];
  for (let y = 0; y <= i; y++) {
    pastHistory.push(incentiveHistory[y]);
  }
  return pastHistory;
};

export const getCurrentIncentiveKey = (poolAddress: string): IncentiveKey => {
  const currentIncentive = getCurrentIncentivePeriod();
  return getIncentiveKey(poolAddress, currentIncentive.startTime, currentIncentive.endTime);
};

export const getPastIncentivesOfPool = (poolAddress?: string) => {
  if (!poolAddress) return [];
  const pastHistory = getPastHistory();
  return pastHistory.map((incentiveItem) => getIncentiveKey(poolAddress, incentiveItem.startTime, incentiveItem.endTime));
};

export const getIncentiveKey = (address: string, startTime?: number, endTime?: number): IncentiveKey => {
  if (startTime && endTime) {
    return {
      rewardToken: TokenVST?.address,
      pool: address,
      startTime: startTime,
      endTime: endTime,
      refundee: RefundeeContractAddress,
    };
  } else {
    const { startTime, endTime } = getCurrentIncentivePeriod();

    return {
      rewardToken: TokenVST?.address,
      pool: address,
      startTime: startTime,
      endTime: endTime,
      refundee: RefundeeContractAddress,
    };
  }
};

// init farming data;
(async function () {
  const farmingsURL = `${import.meta.env.VITE_FarmingConfigUrl}`;
  try {
    const [p] = waitAsyncResult({
      fetcher: (): Promise<{ incentive_history: Array<Incentive>; farmings: { pids: Array<number> } }> => fetch(farmingsURL).then((res) => res.json()),
    });
    const { incentive_history, farmings } = await p;

    if (isEqual(farmings, cachedFarmings) && isEqual(incentive_history, cachedIncentiveHistory)) {
      // 即使数据没有变化，也要设置定时器（可能是页面刷新）
      setupPreciseTimer(incentive_history);
      return;
    }
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
      // 设置智能定时器
      setupPreciseTimer(incentive_history);
      resolveFarmingInit(true);
    }
  } catch (err) {
    console.error('Failed to get the latest farming data: ', err);
  }
})();
