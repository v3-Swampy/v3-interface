import React from 'react';
import useI18n from '@hooks/useI18n';
import Decimal from 'decimal.js';
import { numberWithCommas, trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as HammerIcon } from '@assets/icons/harmmer.svg';
import { ReactComponent as CoffeeCupIcon } from '@assets/icons/coffee_cup.svg';
import { handleClaim as _handleClaim, handleUnstake as _handleUnstake } from '@service/farming';
import { useMyFarms } from '@service/farming';
import { useAccount, useIsChainMatch } from '@service/account';
import AuthConnectButton from '@modules/AuthConnectButton';
import Spin from '@components/Spin';
import showClaimAndUnstakeModal from './ClaimAndUnstakeModal';
import showUnstakeModal from './UnstakeModal';
import { addRecordToHistory } from '@service/history';
import useInTransaction from '@hooks/useInTransaction';
import Button from '@components/Button';
import { ReactComponent as ClockIcon } from '@assets/icons/clock.svg';
import { useCanClaim } from '@service/farming';
import Tooltip from '@components/Tooltip';

const transitions = {
  en: {
    myPosition: 'My staked positions',
    farming: 'Farming',
    paused: 'Paused',
    claim: 'Claim',
    unstake: 'Unstake',
    claimable: 'Claimable',
    liquidity: 'Your Supply',
    tooltipPaused: 'Inactive Liquidity, the current price is outside the range of this position.',
    tooltipFarming: 'Active Liquidity, the current price is within the range of this position.',
  },
  zh: {
    myPosition: 'My staked positions',
    farming: 'Farming',
    paused: 'Paused',
    claim: 'Claim',
    unstake: 'Unstake',
    claimable: 'Claimable',
    liquidity: 'Liquidity',
    tooltipPaused: 'Inactive Liquidity, the current price is outside the range of this position.',
    tooltipFarming: 'Active Liquidity, the current price is within the range of this position.',
  },
} as const;

const className = {
  title: 'color-gray-normal text-xs font-normal not-italic leading-15px mb-2 lt-mobile:mb-1',
  content: 'color-black-normal text-12px font-normal not-italic leading-15px',
  buttonBase: 'flex items-center h-8 rounded-full py-7px px-20.5px relative cursor-pointer lt-mobile:ml-0 lt-mobile:mt-2 lt-mobile:mb-2',
  buttonFarming: 'bg-green-normal/10 color-green-normal',
  buttonFarmingSolid: 'color-green-normal border border-solid border-green-normal bg-white-normal',
  buttonPaused: 'bg-orange-dot/10 color-orange-dot',
  buttonPausedSolid: 'color-orange-dot border border-solid border-orange-dot bg-white-normal',
  incentiveHit: 'h-6 rounded-full px-10px ml-1 flex items-center lt-mobile:mt-2 lt-mobile:ml-0',
  buttonFamingAndPauseMobile: 'lt-mobile:w-[fit-content] lt-mobile:h-24px lt-mobile:px-2 lt-mobile:text-12px lt-mobile:leading-15px lt-mobile:py-0 lt-mobile:!mt-0',
};

const PositionItem: React.FC<{ data: NonNullable<ReturnType<typeof useMyFarms>>[number]['positions'][number]; supply: string | undefined }> = ({ data, supply }) => {
  const { isPositionActive } = data;
  const i18n = useI18n(transitions);
  const account = useAccount();

  const { inTransaction: claimInTransaction, execTransaction: handleClaim } = useInTransaction(_handleClaim, true);
  const { inTransaction: unstakeInTransaction, execTransaction: handleUnstake } = useInTransaction(_handleUnstake, true);
  const isCanClaim = useCanClaim();
  const isChainMath = useIsChainMatch();
  const isPaused = !isPositionActive;

  return (
    <div
      className={`mt-4 grid grid-cols-18 lt-mobile:border-b-1 lt-mobile:border-b-solid lt-mobile:pb-2 lt-mobile:last:border-none lt-mobile:last:pb-0 lt-mobile:last:-mb-2 lt-mobile:border-b-orange-lightHover`}
    >
      <div className="col-span-6 lt-mobile:col-span-18 lt-mobile:pl-16px">
        {isPaused ? (
          <Tooltip text={i18n.tooltipPaused}>
            <div className={`${className.buttonBase} ${className.buttonPaused} mt-3px ml-15px w-122px ${className.buttonFamingAndPauseMobile}`}>
              <span className="absolute -left-14px flex w-6px h-6px">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-dot opacity-75"></span>
                <span className="relative inline-flex w-6px h-6px rounded-full bg-orange-dot"></span>
              </span>
              {<CoffeeCupIcon className="w-6 h-6 mr-1 lt-mobile:w-18px lt-mobile:h-18px"></CoffeeCupIcon>}
              {i18n.paused}
            </div>
          </Tooltip>
        ) : (
          <Tooltip text={i18n.tooltipFarming}>
            <div className={`relative ${className.buttonBase} ${className.buttonFarming} mt-3px ml-15px w-122px ${className.buttonFamingAndPauseMobile}`}>
              <span className="absolute -left-14px flex w-6px h-6px">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-normal opacity-75"></span>
                <span className="relative inline-flex w-6px h-6px rounded-full bg-green-normal"></span>
              </span>
              {<HammerIcon className="w-6 h-6 mr-1 lt-mobile:w-18px lt-mobile:h-18px"></HammerIcon>}
              {i18n.farming}
            </div>
          </Tooltip>
        )}
      </div>
      <div className="col-span-4 lt-mobile:col-span-9 lt-mobile:px-2">
        <div className={`${className.title}`}>{i18n.liquidity}</div>
        {/* @ts-ignore */}
        <div className={`${className.content} flex items-center leading-16px`}>{!supply ? <Spin className="ml-8px text-16px" /> : `$${supply}`}</div>
      </div>
      <div className="col-span-3 lt-mobile:col-span-9">
        <div className={`${className.title}`}>{i18n.claimable}</div>
        <div className={`${className.content} flex items-center`}>
          {data.rewards?.map(({ rewardTokenInfo, stakeReward }) => (
            <div className="flex items-center gap-4px" key={rewardTokenInfo?.address}>
              <img src={rewardTokenInfo?.logoURI} alt={rewardTokenInfo?.symbol} className="w-20px h-20px" />
              <span className="text-12px text-black-normal font-medium">
                {numberWithCommas(trimDecimalZeros(new Decimal(stakeReward.unsettledReward.toString()).div(new Decimal(10).pow(rewardTokenInfo?.decimals ?? 18)).toFixed(2)))}{' '}
                {rewardTokenInfo?.symbol}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end col-span-5 lt-mobile:col-span-18 lt-mobile:mt-2 lt-mobile:justify-around">
        {isChainMath && (
          <AuthConnectButton
            className={`${className.buttonBase} ${isPaused ? className.buttonPausedSolid : className.buttonFarmingSolid} mr-2 !border-none !px-10px lt-mobile:w-46% lt-mobile:mr-0`}
          >
            <Button
              disabled={!isCanClaim}
              loading={claimInTransaction}
              color="white"
              className={`${className.buttonBase} ${isPaused ? className.buttonPausedSolid : className.buttonFarmingSolid} mr-2 lt-mobile:w-46% lt-mobile:mr-0`}
              onClick={async () => {
                const txHash = await handleClaim({
                  VSTIncentiveKey: data.VSTIncentiveKey!,
                  rewards: data.rewards,
                  tokenId: data.tokenId,
                  accountAddress: account as string,
                });
                addRecordToHistory({
                  txHash,
                  type: 'MyFarms_Claim',
                });
              }}
            >
              {i18n.claim}
            </Button>
          </AuthConnectButton>
        )}

        <AuthConnectButton className={`${className.buttonBase} ${isPaused ? className.buttonPausedSolid : className.buttonFarmingSolid} !border-none !px-10px lt-mobile:w-46%`}>
          <Button
            loading={unstakeInTransaction}
            color="white"
            className={`${className.buttonBase} ${isPaused ? className.buttonPausedSolid : className.buttonFarmingSolid} lt-mobile:w-46%`}
            onClick={async () => {
              // if (isCanClaim) {
              //   showUnstakeModal({
              //     isActive: true,
              //     incentive: position?.whichIncentiveTokenIn,
              //     id: position.tokenId,
              //     currentIncentiveKey,
              //     position: position.position,
              //   });
              // } else {
              const txHash = await handleUnstake({
                VSTIncentiveKey: data.VSTIncentiveKey!,
                rewards: data.rewards,
                tokenId: data.tokenId,
                accountAddress: account as string,
              });

              addRecordToHistory({
                txHash,
                type: 'MyFarms_Unstake',
              });
              // }
            }}
          >
            {i18n.unstake}
          </Button>
        </AuthConnectButton>
      </div>
    </div>
  );
};

const Positions: React.FC<{ positions: NonNullable<ReturnType<typeof useMyFarms>>[number]['positions']; supplies: (string | undefined)[] }> = ({ positions, supplies }) => {
  const i18n = useI18n(transitions);

  if (!positions) return null;
  return (
    <div className="rounded-4 bg-white-normal p-6 mt-6 lt-mobile:pt-8 lt-mobile:px-2 lt-mobile:pb-2 lt-mobile:-mt-4">
      <div className="flex items-center lt-mobile:flex-col lt-mobile:items-start">
        <span className="text-14px font-normal font-not-italic leading-18px color-gray-normal">
          {i18n.myPosition} ({positions?.length})
        </span>
      </div>
      <div>
        {positions?.map?.((position, index) => (
          <PositionItem data={position} supply={supplies?.[index]} key={position.tokenId} />
        ))}
      </div>
    </div>
  );
};

export default Positions;
