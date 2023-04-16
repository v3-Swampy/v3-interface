import React, { useMemo } from 'react';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import AuthConnectButton from '@modules/AuthConnectButton';
import useI18n, { compiled } from '@hooks/useI18n';
import DataDetail from './DataDetail';
import showStakeModal, { ModalMode } from './StakeModal';
import { useUserInfo } from '@service/staking';
import dayjs from 'dayjs';
import { handleUnStake } from '@service/staking';
import { useVSTPrice } from '@hooks/usePairPrice';
import { numberWithCommas } from '@utils/numberUtils';
import { ReactComponent as StakeCalculate } from '@assets/icons/stake_calculate.svg';
import {useBoostFactor} from '@service/staking'

const transitions = {
  en: {
    staking: 'Staking',
    stake_tip: 'Stake your {token} to boost your LP farming rewards and increase your Launchpad score.',
    stake_button: 'Stake {token} to boost your farming!',
    my_staked: 'My Staked {token}',
    unstake_time: 'Unstake Time',
    launchpad_score: 'My Launchpad Score',
    launchpad_priority: 'Stake PPI for priority eligibility in Launchpad',
    stake_more: 'Stake More',
    extend: 'Extend',
    unStake: 'Unlock',
    unStake_tip: 'Your Staked VST is ready to unstake.<br/><br/>Please unstake and stake again to get boost on farming',
    current_boosting: 'Your Current Boosting: <b>{boosting}</b>',
  },
  zh: {
    staking: '质押',
    stake_tip: '质押你的 {token} 来提高你的LP耕作奖励，并增加你的Launchpad分数。',
    stake_button: 'Stake {token} to boost your farming!',
    my_staked: 'My Staked {token}',
    unstake_time: 'Unstake Time',
    launchpad_score: 'My Launchpad Score',
    launchpad_priority: 'Stake PPI for priority eligibility in Launchpad',
    stake_more: 'Stake More',
    extend: 'Extend',
    unStake: 'Unlock',
    unStake_tip: 'Your Staked VST is ready to unstake.<br/><br/>Please unstake and stake again to get boost on farming',
    current_boosting: 'Your Current Boosting: <b>{boosting}</b>',
  },
} as const;

enum PersonalStakingStatus {
  UNKNOWN,
  UNLOCKED,
  LOCKED,
  TO_UNLOCK,
}

const StakingPage: React.FC = () => {
  const i18n = useI18n(transitions);
  const [lockedAmount, unlockTime] = useUserInfo();
  const VSTPrice = useVSTPrice();
  const boostingFactor=useBoostFactor()  
  const stakingStatus = useMemo(() => {
    if (!lockedAmount && !unlockTime) return PersonalStakingStatus.UNKNOWN;
    if (!+lockedAmount) return PersonalStakingStatus.UNLOCKED;
    if (+unlockTime <= new Date().valueOf() / 1000) return PersonalStakingStatus.TO_UNLOCK;
    return PersonalStakingStatus.LOCKED;
  }, [lockedAmount, unlockTime]);

  const displayedUnlockedTime = useMemo(() => {
    return unlockTime ? dayjs.unix(unlockTime).format('YYYY-MM-DD HH:mm:ss') : '-';
  }, [unlockTime]);

  const lockedBalanceUSD = useMemo(() => {
    return VSTPrice && lockedAmount ? numberWithCommas(parseFloat((+VSTPrice * +lockedAmount).toFixed(3).slice(0, -1))) : '-';
  }, [VSTPrice, lockedAmount]);

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px">
        <div className="flex items-center mb-16px">
          <span className="ml-16px leading-30px text-24px text-orange-normal font-medium">{i18n.staking}</span>
        </div>
        <BorderBox className="w-full p-16px rounded-28px flex items-stretch gap-32px" variant="gradient-white">
          <DataDetail />

          <div className="flex flex-1 flex-col items-center p-16px rounded-16px bg-orange-light-hover">
            {/* Initial status: Create Lock, thus the user has not staked any token or the staked token has already unlocked */}
            {(stakingStatus === PersonalStakingStatus.UNKNOWN || stakingStatus === PersonalStakingStatus.UNLOCKED) && (
              <div className="flex flex-col items-center w-full">
                <StakeCalculate className="w-74px h-74px mt-64px mb-32px" />
                <p className="leading-18px text-14px font-medium text-black-normal mb-50px max-w-315px text-center">{compiled(i18n.stake_tip, { token: 'VST' })}</p>
                <AuthConnectButton {...bigButtonProps}>
                  <Button {...bigButtonProps} onClick={() => showStakeModal(ModalMode.CreateLock)}>
                    {compiled(i18n.stake_button, { token: 'VST' })}
                  </Button>
                </AuthConnectButton>
              </div>
            )}
            {stakingStatus === PersonalStakingStatus.LOCKED && (
              <div className="flex flex-col w-full">
                <div className="flex w-full flex-1 gap-16px items-stretch text-14px leading-18px text-black-normal">
                  <div className="flex flex-1 flex-col bg-orange-light rounded-16px p-16px justify-between">
                    <p className="font-medium mb-16px">{compiled(i18n.my_staked, { token: 'VST' })}</p>
                    <p className="font-bold text-18px leading-24px">{lockedAmount ?? '...'}</p>
                    <p className="text-black-light font-normal">~{lockedBalanceUSD ? `$${lockedBalanceUSD}` : '-'}</p>
                    <p className="mt-70px">
                      <Button {...smallButtonProps} onClick={() => showStakeModal(ModalMode.IncreaseAmount)}>
                        {i18n.stake_more}
                      </Button>
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col bg-orange-light rounded-16px p-16px justify-between">
                    <div>
                      <p className="font-medium mb-16px">{i18n.unstake_time}</p>
                      <p className="text-black-light font-normal">{displayedUnlockedTime}</p>
                    </div>
                    <Button {...smallButtonProps} onClick={() => showStakeModal(ModalMode.IncreaseUnlockTime, unlockTime)}>
                      {i18n.extend}
                    </Button>
                  </div>
                </div>
                <p className="pl-16px mt-20px w-full font-normal" dangerouslySetInnerHTML={{ __html: compiled(i18n.current_boosting, { boosting: `${boostingFactor}x` }) }} />
              </div>
            )}
            {stakingStatus === PersonalStakingStatus.TO_UNLOCK && (
              <div className="flex flex-col w-full">
                <div className="flex w-full flex-1 gap-16px items-stretch text-14px leading-18px">
                  <div className="flex flex-1 flex-col bg-orange-light rounded-16px p-16px justify-start">
                    <p className="text-black-normal font-medium mb-16px">{compiled(i18n.my_staked, { token: 'VST' })}</p>
                    <p className="text-black-normal font-bold text-18px leading-24px mb-4px">{lockedAmount ?? '...'}</p>
                    <p className="text-black-light">~{lockedBalanceUSD ? `$${lockedBalanceUSD}` : '-'}</p>
                  </div>

                  <div className="flex flex-1 flex-col rounded-16px p-16px border-2px border-solid border-orange-light justify-center">
                    <p className="text-orange-normal font-normal" dangerouslySetInnerHTML={{ __html: i18n.unStake_tip }} />
                    <p className="mt-40px">
                      <Button {...smallButtonProps} onClick={handleUnStake}>
                        {i18n.unStake}
                      </Button>
                    </p>
                  </div>
                </div>
                <p className="pl-16px mt-20px w-full font-normal" dangerouslySetInnerHTML={{ __html: compiled(i18n.current_boosting, { boosting: `${boostingFactor}x` }) }} />
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
