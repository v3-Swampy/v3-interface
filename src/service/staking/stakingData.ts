import { selector, useRecoilValue } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { UniswapV3Factory } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
import { TokenVST } from '@service/tokens';


// TODO: chaozhou
const contractAddress = '0x102e0fb8a5ED6E0f0899C3ed9896cb8973aA29bB'; // UniswapV3Factory.address
const totalStakeVSTQuery = selector({
  key: `TotalStateVSTQuery-${import.meta.env.MODE}`,
  get: () =>
    fetchChain<string>({
      params: [
        {
          data: '0x70a08231000000000000000000000000' + contractAddress.slice(2),
          to: TokenVST.address,
        },
        'latest',
      ],
    }),
});

// TODO: chaozhou
const vSTPriceQuery = selector({
  key: `VSTPriceQuery-${import.meta.env.MODE}`,
  get: () => '0x1',
});

// TODO: chaozhou
const percentageOfCulatingtionQuery = selector({
  key: `percentageOfCulatingtionQuery-${import.meta.env.MODE}`,
  get: () => '24.21',
});

// TODO: chaozhou
const averageStakeDurationQuery = selector({
  key: `averageStakeDurationQuery-${import.meta.env.MODE}`,
  get: () => '7.59',
});

export const useTotalStakeVST = () => {
  const totalStakeVST = useRecoilValue(totalStakeVSTQuery);
  return totalStakeVST ? Unit.fromMinUnit(totalStakeVST) : null;
};

export const useVSTPrice = () => {
  const VSTPrice = useRecoilValue(vSTPriceQuery);
  return VSTPrice ? Unit.fromMinUnit(VSTPrice) : null;
};

export const usePercentageOfCulatingtion = () => useRecoilValue(percentageOfCulatingtionQuery);
export const useAverageStakeDuration = () => useRecoilValue(averageStakeDurationQuery);
