import { selector, useRecoilValue, selectorFamily } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { VSTTokenContract, VotingEscrowContract } from '@contracts/index';
import { fetchChain } from '@utils/fetch';
import { useAccount } from '@service/account';
// import { TokenVST } from '@service/tokens';

//VST Contract
const totalStakeVSTQuery = selector({
  key: `VSTTotalStateQuery-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VSTTokenContract.func.balanceOf(VotingEscrowContract?.address);
    return new Unit(response).toDecimalMinUnit()
  },
});

const vstDecimalsQuery = selector({
  key: `VSTDecimals-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VSTTokenContract.func.decimals();
    return new Unit(response).toDecimalMinUnit()
  },
});

const vstTotalSupplyQuery = selector({
  key: `VSTTotalSupply-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VSTTokenContract.func.totalSupply();
    return new Unit(response).toDecimalMinUnit()
  },
});

const escrowTotalSupplyQuery = selector({
  key: `escrowTotalSupply-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VotingEscrowContract.func.totalSupply();
    return new Unit(response).toDecimalMinUnit()
  },
});

// VotingEscrow Contract

const escrowTotalMaxTimeQuery = selector({
  key: `escrowTotalMaxTime-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VotingEscrowContract.func.maxTime();
    return new Unit(response).toDecimalMinUnit()
  },
});

const escrowDecimalsQuery = selector({
  key: `escrowDecimals-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VotingEscrowContract.func.decimals();
    return new Unit(response).toDecimalMinUnit()
  },
});


const escrowUserInfoQuery = selectorFamily({
  key: `escrowUserInfo-${import.meta.env.MODE}`,
  get: (account) => async () => {
    if (!account) return null;
    const response = await VotingEscrowContract.func.userInfo(account);
    return response;
  },
});

const escrowBalanceOfQuery = selectorFamily({
  key: `escrowBalanceOf-${import.meta.env.MODE}`,
  get: (account) => async () => {
    if (!account) return '0';
    const response = await VotingEscrowContract.func.balanceOf(account);
    return new Unit(response).toDecimalMinUnit();
  },
});



export const useTotalStakeVST = () => {
  const totalStakeVST = useRecoilValue(totalStakeVSTQuery);
  return totalStakeVST ? new Unit(totalStakeVST) : null;
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
  const lockedAmount = account ? new Unit(userInfo?.[0].toString()).toDecimalStandardUnit(0, Number(vstDecimals)) : 0;
  return [lockedAmount, userInfo?.[1]?.toString()];
};
/**
 * calculate the boosting factor
 */
export const useBoostFactor=()=>{
  const account = useAccount();
  const balanceOfVeVst=useRecoilValue(escrowBalanceOfQuery(account))
  let veVSTTotalSupply = useRecoilValue(escrowTotalSupplyQuery);
  //boosting factor = (67% * <amout of veVST> /<total supply of veVST> + 33%) / 33% 
  return Number(veVSTTotalSupply)!=0?(new Unit(0.67).mul(balanceOfVeVst).div(veVSTTotalSupply).add(0.33).div(0.33).toDecimalMinUnit(1)):1
}