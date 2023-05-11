import { selector, useRecoilValue, useRecoilRefresher_UNSTABLE } from 'recoil';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { createVSTTokenContract, VotingEscrowContract } from '@contracts/index';
import { accountState } from '@service/account';
// import { TokenVST } from '@service/tokens';

//VST Contract
const totalStakeVSTQuery = selector({
  key: `VSTTotalStateQuery-${import.meta.env.MODE}`,
  get: async () => {
    const VSTTokenContract = createVSTTokenContract();
    const response = await VSTTokenContract.func.balanceOf(VotingEscrowContract?.address);
    return response ? new Unit(response) : new Unit(0);
  },
});

const vstDecimalsQuery = selector({
  key: `VSTDecimals-${import.meta.env.MODE}`,
  get: async () => {
    const VSTTokenContract = createVSTTokenContract();
    const response = await VSTTokenContract.func.decimals();
    return response ? Number(response) : undefined;
  },
});

const vstTotalSupplyQuery = selector({
  key: `VSTTotalSupply-${import.meta.env.MODE}`,
  get: async () => {
    const VSTTokenContract = createVSTTokenContract();
    const response = await VSTTokenContract.func.totalSupply();
    return response ? new Unit(response) : undefined;
  },
});

const escrowTotalSupplyQuery = selector({
  key: `escrowTotalSupply-${import.meta.env.MODE}`,
  get: async () => {
    const response = await VotingEscrowContract.func.totalSupply();
    return response ? new Unit(response) : new Unit(0);
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
    return response ? new Unit(response) : new Unit(0);
  },
});

const escrowBoostFactor = selector({
  key: `escrowBoostFactor-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    if (!account) return undefined;
    const responseBalance = await VotingEscrowContract.func.balanceOf(account);
    const balance = responseBalance ? new Unit(responseBalance) : new Unit(0);
    const responseTs = await VotingEscrowContract.func.totalSupply();
    const totalSupply = responseTs ? new Unit(responseTs) : new Unit(0);
    return totalSupply?.toDecimalMinUnit() != '0' && balance ? balance.mul(0.67).div(totalSupply).add(0.33).div(0.33).toDecimalMinUnit(1) : 1;
  },
});

export const useTotalStakeVST = () => useRecoilValue(totalStakeVSTQuery);
export const useVstDecimals = () => useRecoilValue(vstDecimalsQuery);
export const useVstTotalSupply = () => useRecoilValue(vstTotalSupplyQuery);
export const useVETotalSupply = () => useRecoilValue(escrowTotalSupplyQuery);
export const useVEMaxTime = () => useRecoilValue(escrowTotalMaxTimeQuery);
export const useEscrowDecimals = () => useRecoilValue(escrowDecimalsQuery);
export const useEscrowUserInfo = () => useRecoilValue(escrowUserInfoQuery);
export const useBalanceOfveVst = () => useRecoilValue(escrowBalanceOfQuery);
export const useBoostFactor = () => useRecoilValue(escrowBoostFactor);

export const useStakePercent = () => {
  const totalStakeVST = useTotalStakeVST();
  const totalSupply = useVstTotalSupply();
  return totalStakeVST && totalSupply ? totalStakeVST.div(totalSupply).mul(100).toDecimalMinUnit(2) : '-';
};

export const useAverageStakeDuration = () => {
  const totalLocked = useTotalStakeVST();
  const veVSTTotalSupply = useVETotalSupply();
  const maxTime = useVEMaxTime();
  if (!veVSTTotalSupply || !totalLocked || !maxTime) return '-';
  const avgValue: number = Number(totalLocked.toDecimalMinUnit() != '0' ? veVSTTotalSupply.mul(maxTime).div(totalLocked).toDecimalMinUnit() : 0);
  const SECONDS_PER_DAY = 86400;

  if (avgValue > SECONDS_PER_DAY * 30) return `${(avgValue / (SECONDS_PER_DAY * 30)).toFixed(2)} months`;
  return `${(avgValue / (SECONDS_PER_DAY * 7)).toFixed(2)} weeks`;
};

export const useUserInfo = () => {
  const userInfo = useEscrowUserInfo();
  const vstDecimals = useVstDecimals();
  const lockedAmount = userInfo?.[0] && vstDecimals ? new Unit(userInfo?.[0]).toDecimalStandardUnit(undefined, vstDecimals) : '0';
  const unlockTime = Number(userInfo?.[1]) ?? 0;
  const result: [string, number] = [lockedAmount, unlockTime];
  return result;
};

export const useRefreshUserInfo = () => useRecoilRefresher_UNSTABLE(escrowUserInfoQuery);
export const useRefreshBalanceOfveVST = () => useRecoilRefresher_UNSTABLE(escrowBalanceOfQuery);
export const useRefreshTotalStakedVST = () => useRecoilRefresher_UNSTABLE(totalStakeVSTQuery);
export const useRefreshBoostFactor = () => useRecoilRefresher_UNSTABLE(escrowBoostFactor);
