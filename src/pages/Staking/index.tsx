import React, { useMemo } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import AuthConnectButton from '@modules/AuthConnectButton';
import useI18n, { compiled } from '@hooks/useI18n';
import DataDetail from './DataDetail';
import showStakeModal, { ModalMode } from './StakeModal';
import { useUserInfo } from '@service/staking';
import dayjs from 'dayjs';
import { handleUnStake, useBoostFactor } from '@service/staking';
import { TokenVST } from '@service/tokens';
// import { useVSTPrice } from '@hooks/usePairPrice';
import { useTokenPrice } from '@service/pairs&pool';
import { numberWithCommas, trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as StakeCalculate } from '@assets/icons/stake_calculate.svg';
import { addRecordToHistory } from '@service/history';

const transitions = {
  en: {
    staking: 'Staking',
    stake_tip: 'Stake your {token} to boost your LP farming rewards.',
    stake_button: 'Stake {token}',
    my_staked: 'My Staked {token}',
    unstake_time: 'Unstake Time',
    launchpad_score: 'My Launchpad Score',
    launchpad_priority: 'Stake PPI for priority eligibility in Launchpad',
    stake_more: 'Stake More',
    extend: 'Extend',
    unStake: 'Unstake',
    unStake_tip: 'Your Staked VST is ready to unstake.<br/><br/>Please unstake and stake again to get boost on farming',
    current_boosting: 'Your Current Boosting: <b>{boosting}</b>',
  },
  zh: {
    staking: '质押',
    stake_tip: '质押你的 {token} 来提高你的 LP 耕作奖励。',
    stake_button: 'Stake {token}',
    my_staked: 'My Staked {token}',
    unstake_time: 'Unstake Time',
    launchpad_score: 'My Launchpad Score',
    launchpad_priority: 'Stake PPI for priority eligibility in Launchpad',
    stake_more: 'Stake More',
    extend: 'Extend',
    unStake: 'Unstake',
    unStake_tip: 'Your Staked VST is ready to unstake.<br/><br/>Please unstake and stake again to get boost on farming',
    current_boosting: 'Your Current Boosting: <b>{boosting}</b>',
  },
} as const;

enum PersonalStakingStatus {
  UNLOCKED,
  LOCKED,
  TO_UNLOCK,
}

const StakingPage: React.FC = () => {
  const i18n = useI18n(transitions);
  const [lockedAmount, unlockTime] = useUserInfo();
  const VSTPrice = useTokenPrice(TokenVST.address);
  const boostingFactor = useBoostFactor();
  const stakingStatus = useMemo(() => {
    if (unlockTime === 0 || lockedAmount === '0') return PersonalStakingStatus.UNLOCKED;
    if (unlockTime <= dayjs().unix()) return PersonalStakingStatus.TO_UNLOCK;
    return PersonalStakingStatus.LOCKED;
  }, [lockedAmount, unlockTime]);

  const displayedUnlockedTime = useMemo(() => {
    return unlockTime ? dayjs.unix(unlockTime).format('YYYY-MM-DD HH:mm:ss') : '-';
  }, [unlockTime]);

  const lockedBalanceUSD = useMemo(() => {
    return VSTPrice && lockedAmount ? numberWithCommas(new Unit(lockedAmount).mul(VSTPrice).toDecimalMinUnit(3)) : '-';
  }, [VSTPrice, lockedAmount]);

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px">
        <div className="flex items-center mb-16px">
          <span className="ml-16px leading-30px text-24px text-orange-normal font-medium lt-mobile:text-18px lt-mobile:leading-24px">{i18n.staking}</span>
        </div>
        <BorderBox className="w-full p-16px rounded-28px flex items-stretch gap-32px lt-mobile:flex-col lt-mobile:gap-16px lt-mobile:rounded-14px" variant="gradient-white">
          <DataDetail />

          <div className="flex flex-1 flex-col items-center p-16px rounded-16px bg-orange-light-hover lt-mobile:rounded-14px lt-mobile:p-0px">
            {/* Initial status: Create Lock, thus the user has not staked any token or the staked token has already unlocked */}
            {stakingStatus === PersonalStakingStatus.UNLOCKED && (
              <div className="flex flex-col items-center w-full lt-mobile:p-16px">
                <StakeCalculate className="w-74px h-74px mt-64px mb-32px" />
                <p className="leading-18px text-14px font-medium text-black-normal mb-50px max-w-315px text-center">{compiled(i18n.stake_tip, { token: TokenVST.symbol })}</p>
                <AuthConnectButton {...bigButtonProps}>
                  <Button {...bigButtonProps} onClick={() => showStakeModal(ModalMode.CreateLock)}>
                    {compiled(i18n.stake_button, { token: TokenVST.symbol })}
                  </Button>
                </AuthConnectButton>
              </div>
            )}
            {stakingStatus === PersonalStakingStatus.LOCKED && (
              <div className="flex flex-col w-full lt-mobile:p-8px">
                <div className="flex w-full flex-1 gap-16px items-stretch text-14px leading-18px text-black-normal lt-mobile:flex-col lt-mobile:gap-8px">
                  <div className="flex flex-1 flex-col bg-orange-light rounded-16px p-16px justify-between lt-mobile:rounded-8px">
                    <p className="font-medium mb-16px">{compiled(i18n.my_staked, { token: TokenVST.symbol })}</p>
                    <p className="font-bold text-18px leading-24px">{trimDecimalZeros(new Unit(lockedAmount).toDecimalMinUnit(5)) ?? '...'}</p>
                    <p className="text-black-light font-normal">~{lockedBalanceUSD ? `$${lockedBalanceUSD}` : '-'}</p>
                    <p className="mt-70px lt-mobile:mt-24px">
                      <AuthConnectButton {...smallButtonProps}>
                        <Button {...smallButtonProps} onClick={() => showStakeModal(ModalMode.IncreaseAmount)}>
                          {i18n.stake_more}
                        </Button>
                      </AuthConnectButton>
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col bg-orange-light rounded-16px p-16px justify-between lt-mobile:rounded-8px">
                    <div className="lt-mobile:mb-24px">
                      <p className="font-medium mb-16px">{i18n.unstake_time}</p>
                      <p className="text-black-light font-normal">{displayedUnlockedTime}</p>
                    </div>
                    <AuthConnectButton {...smallButtonProps}>
                      <Button {...smallButtonProps} onClick={() => showStakeModal(ModalMode.IncreaseUnlockTime)}>
                        {i18n.extend}
                      </Button>
                    </AuthConnectButton>
                  </div>
                </div>
                <p className="pl-16px mt-20px w-full font-normal lt-mobile:pl-0px lt-mobile:mt-8px" dangerouslySetInnerHTML={{ __html: compiled(i18n.current_boosting, { boosting: `${boostingFactor}x` }) }} />
              </div>
            )}
            {stakingStatus === PersonalStakingStatus.TO_UNLOCK && (
              <div className="flex flex-col w-full lt-mobile:p-8px">
                <div className="flex w-full flex-1 gap-16px items-stretch text-14px leading-18px lt-mobile:flex-col lt-mobile:gap-8px">
                  <div className="flex flex-1 flex-col bg-orange-light rounded-16px p-16px justify-start lt-mobile:rounded-8px lt-mobile:pb-80px">
                    <p className="text-black-normal font-medium mb-16px">{compiled(i18n.my_staked, { token: TokenVST.symbol })}</p>
                    <p className="text-black-normal font-bold text-18px leading-24px mb-4px">{lockedAmount ?? '...'}</p>
                    <p className="text-black-light">~{lockedBalanceUSD ? `$${lockedBalanceUSD}` : '-'}</p>
                  </div>

                  <div className="flex flex-1 flex-col rounded-16px p-16px border-2px border-solid border-orange-light justify-center lt-mobile:border-none lt-mobile:bg-orange-light lt-mobile:rounded-8px">
                    <p className="text-orange-normal font-normal" dangerouslySetInnerHTML={{ __html: i18n.unStake_tip }} />
                    <p className="mt-40px lt-mobile:mt-24px">
                      <AuthConnectButton {...smallButtonProps}>
                        <Button
                          {...smallButtonProps}
                          onClick={async () => {
                            const txHash = await handleUnStake();
                            addRecordToHistory({
                              txHash,
                              type: 'Stake_Unlock',
                              tokenA_Address: TokenVST.address,
                            });
                          }}
                        >
                          {i18n.unStake}
                        </Button>
                      </AuthConnectButton>
                    </p>
                  </div>
                </div>
                <p className="pl-16px mt-20px w-full font-normal lt-mobile:pl-0px lt-mobile:mt-8px" dangerouslySetInnerHTML={{ __html: compiled(i18n.current_boosting, { boosting: `${boostingFactor}x` }) }} />
              </div>
            )}
          </div>
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

const bigButtonProps = {
  color: 'gradient',
  fullWidth: true,
  className: 'h-40px rounded-100px text-18px font-medium',
} as const;

const smallButtonProps = {
  color: 'gradient',
  fullWidth: true,
  className: 'h-40px rounded-100px text-14px font-medium',
} as const;

export default StakingPage;
