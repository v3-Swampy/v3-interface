import React, { useMemo,useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import AuthConnectButton from '@modules/AuthConnectButton';
import useI18n, { compiled } from '@hooks/useI18n';
import DataDetail from './DataDetail';
import showStakeModal, { ModalMode } from './StakeModal';
import { useUserInfo } from '@service/staking';
import dayjs from 'dayjs';
import { handleUnStake  } from '@service/staking';
import useAllCurrencyCombinations from '@hooks/useAllCurrencyCombinations';
import {useTokenFromList} from '@hooks/useTokensBySymbols';
import {useV2Pairs} from '@hooks/useV2Pairs';
import { Currency, CurrencyAmount, TradeType } from '@uniswap/sdk-core'


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
    unStake:'Unlock',
    unStake_tip:'Your Staked VST is ready to unstake. Please unstake and stake again to get boost on farming'
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
    unStake:'Unlock',
    unStake_tip:'Your Staked VST is ready to unstake. Please unstake and stake again to get boost on farming'
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
  const currencyIn=useTokenFromList('WCFX')
  const currencyOut=useTokenFromList('USDT')
  const currencyOut2=CurrencyAmount.fromRawAmount(currencyOut, 100_000e6)
  const allCurrencyCombinations=useAllCurrencyCombinations(currencyIn,currencyOut2.currency)
  const allPairs = useV2Pairs(allCurrencyCombinations)
  console.info('allPairs', allPairs)
  const stakingStatus = useMemo(() => {
    if (!lockedAmount && !unlockTime) return PersonalStakingStatus.UNKNOWN;
    if (!+lockedAmount) return PersonalStakingStatus.UNLOCKED;
    if (+unlockTime <= new Date().valueOf() / 1000) return PersonalStakingStatus.TO_UNLOCK;
    return PersonalStakingStatus.LOCKED;
  }, [lockedAmount, unlockTime]);

  const displayedUnlockedTime = useMemo(() => {
    return unlockTime ? dayjs.unix(unlockTime).format('YYYY-MM-DD HH:mm:ss') : '-'
  }, [unlockTime]) 

  return (
    <PageWrapper className="pt-56px">
      <BorderBox className="relative mx-auto max-w-572px p-16px rounded-28px" variant="gradient-white">
        <div className="mb-16px flex justify-between items-center pr-8px">
          <span className="w-84px h-40px leading-40px rounded-100px text-center text-14px text-black-normal font-medium bg-orange-light-hover">{i18n.staking}</span>
        </div>

        <DataDetail />

        <BorderBox variant="gradient-orange-light-hover" className="mt-16px flex p-16px rounded-20px">
          {/* Initial status: Create Lock, thus the user has not staked any token or the staked token has already unlocked */}
          {(stakingStatus === PersonalStakingStatus.UNKNOWN || stakingStatus === PersonalStakingStatus.UNLOCKED) && (
            <>
              <div className="w-1/2">
                <p className="leading-20px text-12px text-black-normal">{compiled(i18n.stake_tip, { token: 'VST' })}</p>
                <AuthConnectButton {...bigButtonProps}>
                  <Button {...bigButtonProps} onClick={() => showStakeModal(ModalMode.CreateLock)}>
                    {compiled(i18n.stake_button, { token: 'VST' })}
                  </Button>
                </AuthConnectButton>
              </div>

              <div className="w-1/2 flex flex-col justify-center items-end">
                <img src="" alt="Stake VST, harvest more." />

                <Link to="/stake/simulator" className="block mt-16px text-12px text-black-normal">
                  Simulate your staking strategy →
                </Link>
              </div>
            </>
          )}
          {stakingStatus === PersonalStakingStatus.LOCKED && (
            <>
              <div className="w-1/2">
                <p className="leading-23px text-14px text-gray-normal">{compiled(i18n.my_staked, { token: 'VST' })}</p>
                <p className="leading-23px text-16px text-black-normal font-medium">{lockedAmount ?? '...'}</p>
                <p className="leading-23px h-14px text-black-normal">~ ${'8000'}</p>
                  <Button {...smallButtonProps} onClick={() => showStakeModal(ModalMode.IncreaseAmount)}>
                    {i18n.stake_more}
                  </Button>
              </div>

              <div className="w-1/2 flex flex-col justify-center">
                <p className="leading-23px text-14px text-gray-normal">{i18n.unstake_time}</p>
                <p className="leading-23px text-16px text-black-normal font-medium">{displayedUnlockedTime}</p>
                <p className="leading-23px h-14px text-black-normal font-medium"></p>
                  <Button {...smallButtonProps} onClick={() => showStakeModal(ModalMode.IncreaseUnlockTime)}>
                    {i18n.extend}
                  </Button>
              </div>
            </>
          )}
          {stakingStatus === PersonalStakingStatus.TO_UNLOCK && (
            <>
              <div className="w-1/2">
                <p className="leading-23px text-14px text-gray-normal">{compiled(i18n.my_staked, { token: 'VST' })}</p>
                <p className="leading-23px text-16px text-black-normal font-medium">{lockedAmount ?? '...'}</p>
                <p className="leading-23px h-14px text-black-normal">~ ${'8000'}</p>
              </div>

              <div className="w-1/2 flex flex-col justify-center">
                <p className="leading-23px text-16px text-black-normal font-medium">{i18n.unStake_tip}</p>
                  <Button {...smallButtonProps} onClick={handleUnStake}>
                    {i18n.unStake}
                  </Button>
              </div>
            </>
          )}
        </BorderBox>
      </BorderBox>
    </PageWrapper>
  );
};

const bigButtonProps = {
  color: 'gradient',
  fullWidth: true,
  className: 'mt-26px h-36px rounded-10px text-14px',
} as const;

const smallButtonProps = {
  color: 'gradient',
  fullWidth: true,
  className: 'mt-26px w-160px h-36px rounded-10px text-14px',
} as const;




export default StakingPage;
