import { selector, useRecoilValue } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { VSTTokenContract, VotingEscrowContract } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
// import { TokenVST } from '@service/tokens';

//VST Contract
const totalStakeVSTQuery = selector({
  key: `VSTTotalStateQuery-${import.meta.env.MODE}`,
  get: () =>
    fetchChain<string>({
      params: [
        {
          data: VSTTokenContract.func.encodeFunctionData('balanceOf', [VotingEscrowContract?.address]),
          to: VSTTokenContract.address,
        },
        'latest',
      ],
    }),
});

const vstDecimalsQuery = selector({
  key: `VSTDecimals-${import.meta.env.MODE}`,
  get: () =>
    fetchChain<any>({
      params: [
        {
          data: VSTTokenContract.func.encodeFunctionData('decimals'),
          to: VSTTokenContract.address,
        },
        'latest',
      ],
    }),
});

const vstTotalSupplyQuery = selector({
  key: `VSTTotalSupply-${import.meta.env.MODE}`,
  get: () =>
    fetchChain<any>({
      params: [
        {
          data: VSTTokenContract.func.encodeFunctionData('totalSupply'),
          to: VSTTokenContract.address,
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

const escrowTotalSupplyQuery = selector({
  key: `escrowTotalSupply-${import.meta.env.MODE}`,
  get: () =>
    fetchChain<string>({
      params: [
        {
          data: VotingEscrowContract.func.encodeFunctionData('totalSupply'),
          to: VotingEscrowContract.address,
        },
        'latest',
      ],
    }),
});

const escrowTotalMaxTimeQuery = selector({
  key: `escrowTotalMaxTime-${import.meta.env.MODE}`,
  get: () =>
    fetchChain<string>({
      params: [
        {
          data: VotingEscrowContract.func.encodeFunctionData('maxTime'),
          to: VotingEscrowContract.address,
        },
        'latest',
      ],
    }),
});

const escrowDecimalsQuery = selector({
  key: `escrowDecimals-${import.meta.env.MODE}`,
  get: () =>
    fetchChain<string>({
      params: [
        {
          data: VotingEscrowContract.func.encodeFunctionData('decimals'),
          to: VotingEscrowContract.address,
        },
        'latest',
      ],
    }),
});

export const useTotalStakeVST = () => {
  const totalStakeVST = useRecoilValue(totalStakeVSTQuery);
  return totalStakeVST ? Unit.fromMinUnit(totalStakeVST) : null;
};

export const useVSTPrice = () => {
  const VSTPrice = useRecoilValue(vSTPriceQuery);
  return VSTPrice ? Unit.fromMinUnit(VSTPrice) : null;
};

export const usePercentageOfCulatingtion = () => {
  const totalStakeVST = useRecoilValue(totalStakeVSTQuery);
  const totalSupply = useRecoilValue(vstTotalSupplyQuery);
  if (!+totalSupply) return '-';
  return `${((+totalStakeVST / +totalSupply) * 100).toFixed(2)}`;
};

export const useAverageStakeDuration = () => {
  const totalLocked = useRecoilValue(totalStakeVSTQuery);
  const vePPITotalSupply = useRecoilValue(escrowTotalSupplyQuery);
  const maxTime = useRecoilValue(escrowTotalMaxTimeQuery);
  if (!+vePPITotalSupply || !+totalLocked || !maxTime) return '-';
  const avgValue: number = (+vePPITotalSupply * +maxTime) / +totalLocked;
  const SECONDS_PER_DAY = 86400;

  if (avgValue > SECONDS_PER_DAY * 30) return `${(avgValue / (SECONDS_PER_DAY * 30)).toFixed(2)} months`;
  return `${(avgValue / (SECONDS_PER_DAY * 7)).toFixed(2)} weeks`;
};
