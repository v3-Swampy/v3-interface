import { atom } from 'recoil';
import { getRecoil, setRecoil } from 'recoil-nexus';
import { fetchChain } from '@utils/fetch';
import { MulticallContract } from '@contracts/index';

const fetchTimestamp = () => fetchChain({
  params: [
    {
      to: MulticallContract.address,
      data: MulticallContract.func.interface.encodeFunctionData('getCurrentBlockTimestamp')
    },
    'latest'
  ],
}).then((res) => MulticallContract.func.interface.decodeFunctionResult('getCurrentBlockTimestamp', res as string)).then(res => Number(res));


export const timestampState = atom<number | undefined>({
  key: `timestampState-${import.meta.env.MODE}`,
  default: undefined,
});


export const getTimestamp = async () => {
  const cachedTimestamp = getRecoil(timestampState);
  if (cachedTimestamp !== undefined) {
    return cachedTimestamp;
  }
  const timestamp = await fetchTimestamp();
  setRecoil(timestampState, timestamp);
  return timestamp;
}