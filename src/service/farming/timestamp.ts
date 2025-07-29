import { selector, useRecoilValue } from 'recoil';
import { useAutoRefreshData } from '@utils/recoilUtils';
import { fetchChain } from '@utils/fetch';
import { MulticallContract } from '@contracts/index';
import { customBlockNumber } from '@service/pairs&pool/utils';

const fetchTimestamp = () => fetchChain({
  params: [
    {
      to: MulticallContract.address,
      data: MulticallContract.func.interface.encodeFunctionData('getCurrentBlockTimestamp')
    },
    customBlockNumber
  ],
}).then((res) => MulticallContract.func.interface.decodeFunctionResult('getCurrentBlockTimestamp', res as string)).then(res => Number(res));


export const timestampSelector = selector<number>({
  key: `timestampSelector-${import.meta.env.MODE}`,
  get: () => fetchTimestamp(),
});


export const useTimestamp = () => useRecoilValue(timestampSelector);
export const useAutoRefreshTimestamp = () =>
  useAutoRefreshData({
    recoilValue: timestampSelector,
    fetcher: fetchTimestamp,
    interval: 1000,
    refreshImmediately: true,
  });
