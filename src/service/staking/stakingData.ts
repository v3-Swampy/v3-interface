import { selector, useRecoilValue } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { VSTTokenContract, VotingEscrowContract } from '@contracts/index';
import { accountState } from '@service/account';
// import { TokenVST } from '@service/tokens';

//VST Contract
const totalStakeVSTQuery = selector({
  key: `VSTTotalStateQuery-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VSTTokenContract.func.balanceOf(VotingEscrowContract?.address);
    return response ? new Unit(response) : undefined;
  },
});

const vstDecimalsQuery = selector({
  key: `VSTDecimals-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VSTTokenContract.func.decimals();
    return response ? Number(response) : undefined;
  },
});

const vstTotalSupplyQuery = selector({
  key: `VSTTotalSupply-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VSTTokenContract.func.totalSupply();
    return response ? new Unit(response) : undefined;
  },
});

const escrowTotalSupplyQuery = selector({
  key: `escrowTotalSupply-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VotingEscrowContract.func.totalSupply();
    return response ? new Unit(response) : undefined;
  },
});

// VotingEscrow Contract

const escrowTotalMaxTimeQuery = selector({
  key: `escrowTotalMaxTime-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VotingEscrowContract.func.maxTime();
    return response ? Number(response) : undefined;
  },
});

const escrowDecimalsQuery = selector({
  key: `escrowDecimals-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VotingEscrowContract.func.decimals();
    return response ? Number(response) : undefined;
  },
});

const escrowUserInfoQuery = selector({
  key: `escrowUserInfo-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    if (!account) return null;
    const response = await VotingEscrowContract.func.userInfo(account);
    return response;
  },
});

const escrowBalanceOfQuery = selector({
  key: `escrowBalanceOf-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    if (!account) return undefined;
    const response = await VotingEscrowContract.func.balanceOf(account);
    return response ? new Unit(response) : undefined;
  },
});

export const useTotalStakeVST = () => useRecoilValue(totalStakeVSTQuery);

export const useStakePercent = () => {
  const totalStakeVST = useRecoilValue(totalStakeVSTQuery);
  const totalSupply = useRecoilValue(vstTotalSupplyQuery);
  return totalStakeVST && totalSupply ? totalStakeVST.div(totalSupply).mul(100).toDecimalMinUnit(2) : '-';
};

export const useAverageStakeDuration = () => {
  const totalLocked = useRecoilValue(totalStakeVSTQuery);
  const veVSTTotalSupply = useRecoilValue(escrowTotalSupplyQuery);
  const maxTime = useRecoilValue(escrowTotalMaxTimeQuery);
  if (!veVSTTotalSupply || !totalLocked || !maxTime) return '-';
  const avgValue: number = Number(veVSTTotalSupply.mul(maxTime).div(totalLocked).toDecimalMinUnit());
  const SECONDS_PER_DAY = 86400;

  if (avgValue > SECONDS_PER_DAY * 30) return `${(avgValue / (SECONDS_PER_DAY * 30)).toFixed(2)} months`;
  return `${(avgValue / (SECONDS_PER_DAY * 7)).toFixed(2)} weeks`;
};

export const useUserInfo = () => {
  const userInfo = useRecoilValue(escrowUserInfoQuery);
  const vstDecimals = useRecoilValue(vstDecimalsQuery);
  const lockedAmount = userInfo?.[0] && vstDecimals ? new Unit(userInfo?.[0]).toDecimalStandardUnit(undefined, vstDecimals) : '0';
  const unlockTime = Number(userInfo?.[1]) ?? 0;
  const result: [string, number] = [lockedAmount, unlockTime];
  return result;
};

export const userBalanceOfveVst = () => useRecoilValue(escrowBalanceOfQuery);
/**
 * calculate the boosting factor
 */
export const useBoostFactor = () => {
  const balanceOfVeVst = userBalanceOfveVst();
  let veVSTTotalSupply = useRecoilValue(escrowTotalSupplyQuery);
  console.log('stake', balanceOfVeVst?.toDecimalMinUnit(), veVSTTotalSupply?.toDecimalMinUnit());
  //boosting factor = (67% * <amout of veVST> /<total supply of veVST> + 33%) / 33%
  return veVSTTotalSupply && balanceOfVeVst ? balanceOfVeVst.mul(0.67).div(veVSTTotalSupply).add(0.33).div(0.33).toDecimalMinUnit(1) : 1;
};
