import { selector, useRecoilValue, selectorFamily } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { VSTTokenContract, VotingEscrowContract } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
import { useAccount } from '@service/account';
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

// VotingEscrow Contract

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

const escrowUserInfoQuery = selectorFamily({
  key: `escrowUserInfo-${import.meta.env.MODE}`,
  get:
    (account) =>
    async ({}) => {
      if (!account) return null;
      const fetchRes = await fetchChain<string>({
        params: [
          {
            data: VotingEscrowContract.func.encodeFunctionData('userInfo', [account]),
            to: VotingEscrowContract.address,
          },
          'latest',
        ],
      });
      const decodedRes = VotingEscrowContract.func.decodeFunctionResult('userInfo', fetchRes);
      return decodedRes;
    },
});

export const useTotalStakeVST = () => {
  const totalStakeVST = useRecoilValue(totalStakeVSTQuery);
  return totalStakeVST ? new Unit(totalStakeVST) : null;
};

export const useVSTPrice = () => {
  const VSTPrice = useRecoilValue(vSTPriceQuery);
  return VSTPrice ? new Unit(VSTPrice) : null;
};

export const usePercentageOfCulatingtion = () => {
  const totalStakeVST = useRecoilValue(totalStakeVSTQuery);
  const totalSupply = useRecoilValue(vstTotalSupplyQuery);
  if (!+totalSupply) return '-';
  return `${((+totalStakeVST / +totalSupply) * 100).toFixed(2)}`;
};

export const useAverageStakeDuration = () => {
  const totalLocked = useRecoilValue(totalStakeVSTQuery);
  const veVSTTotalSupply = useRecoilValue(escrowTotalSupplyQuery);
  const maxTime = useRecoilValue(escrowTotalMaxTimeQuery);
  if (!+veVSTTotalSupply || !+totalLocked || !maxTime) return '-';
  const avgValue: number = (+veVSTTotalSupply * +maxTime) / +totalLocked;
  const SECONDS_PER_DAY = 86400;

  if (avgValue > SECONDS_PER_DAY * 30) return `${(avgValue / (SECONDS_PER_DAY * 30)).toFixed(2)} months`;
  return `${(avgValue / (SECONDS_PER_DAY * 7)).toFixed(2)} weeks`;
};

export const useUserInfo = () => {
  const account = useAccount();
  const userInfo = useRecoilValue(escrowUserInfoQuery(account));
  const vstDecimals = useRecoilValue(vstDecimalsQuery);
  const lockedAmount = account ? new Unit(userInfo?.[0].toString()).toDecimalStandardUnit(0, vstDecimals) : 0;
  return [lockedAmount, userInfo?.[1]?.toString()];
};
