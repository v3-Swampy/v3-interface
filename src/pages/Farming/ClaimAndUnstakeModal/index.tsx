import React, { Suspense } from 'react';
import cx from 'clsx';
import useI18n, { toI18n, compiled } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import { ReactComponent as LogoIcon } from '@assets/icons/logo_icon.svg';
import Spin from '@components/Spin';
import Button from '@components/Button';
import { type IncentiveKey } from '@service/farming';
import { handleClaimUnStake as _handleClaimUnStake, handleClaimAndReStake as _handleClaimAndReStake } from '@service/farming/myFarms';
import { useAccount } from '@service/account';
import useInTransaction from '@hooks/useInTransaction';
import { addRecordToHistory } from '@service/history';
import type { PoolType } from '@service/farming';
import { PositionForUI } from '@service/position';
import { hidePopup } from '@components/showPopup';
import AuthConnectButton from '@modules/AuthConnectButton';
import { isMobile } from '@utils/is';

const transitions = {
  en: {
    title: 'Claim & Unstake',
    info: 'New {symbol0}/{symbol1} incentive pool is live! Click “<span class="text-orange-normal">Claim & Stake to New</span>” to earn!',
    claimAndUnstake: 'Claim & Unstake',
    claimAndStake: 'Claim & Stake to New',
  },
  zh: {
    title: 'Claim & Unstake',
    info: 'New {symbol0}/{symbol1} incentive pool is live! Click “<span class="text-orange-normal">Claim & Stake to New</span>” to earn!',
    claimAndUnstake: 'Claim & Unstake',
    claimAndStake: 'Claim & Stake to New',
  },
} as const;

export enum ModalMode {
  Unknown,
  CreateLock,
  IncreaseAmount,
  IncreaseUnlockTime,
}

type Props = ConfirmModalInnerProps & PoolType;

interface ModalType {
  isActive: boolean;
  incentive: any;
  id: number;
  pid: number;
  currentIncentiveKey: IncentiveKey;
  position: PositionForUI;
}

const ClaimAndUnstakeModal: React.FC<ModalType> = ({ isActive, incentive, id, pid, currentIncentiveKey, position }) => {
  const i18n = useI18n(transitions);
  const account = useAccount();
  // @ts-ignore
  const { inTransaction, execTransaction: handleClaimUnStake } = useInTransaction(_handleClaimUnStake, true);
  // @ts-ignore
  const { inTransaction: inTransaction2, execTransaction: handleClaimAndReStake } = useInTransaction(_handleClaimAndReStake, true);

  const classNames = {
    baseButton: cx(
      'w-258px h-48px text-gray-normal font-normal font-not-italic text-16px flex items-center justify-center color-gray-normal rounded-full cursor-pointer',
      isMobile && 'lt-mobile:w-164px lt-mobile:h-40px lt-mobile:text-14px lt-mobile:leading-18px'
    ),
    activeButton: 'color-white-normal bg-orange-normal',
  };

  return (
    <div className={cx('mt-24px min-h-318px !flex flex-col items-center justify-center', isMobile && 'lt-mobile:relative lt-mobile:min-h-400px')}>
      <LogoIcon className={cx('-mt-8 w-120px h-120px', isMobile && 'lt-mobile:w-100px lt-mobile:h-100px')} />
      <div
        className={cx("text-22px leading-28px font-400 font-not-italic mt-8 w-90", isMobile && 'lt-mobile:text-14px lt-mobile:leading-18px lt-mobile:w-240px')}
        dangerouslySetInnerHTML={{
          __html: compiled(i18n.info, { symbol0: position?.token0?.symbol, symbol1: position?.token1?.symbol }),
        }}
      ></div>
      <div className={cx("absolute flex bottom-6 left-4 right-4 justify-between", isMobile && 'lt-mobile:left-0 lt-mobile:right-0 lt-mobile:justify-around')}>
        <AuthConnectButton className={`${classNames.baseButton} border border-solid bg-white-normal`}>
          <Button
            loading={inTransaction}
            color="gray"
            className={`${classNames.baseButton} border border-solid bg-white-normal`}
            onClick={async () => {
              const txHash = await handleClaimUnStake({
                isActive,
                key: incentive,
                tokenId: id,
                pid,
                accountAddress: account as string,
              });

              setTimeout(() => {
                hidePopup();
              }, 200);

              addRecordToHistory({
                txHash,
                type: 'MyFarms_ClaimAndUnstake',
              });
            }}
          >
            {i18n.claimAndUnstake}
          </Button>
        </AuthConnectButton>
        <AuthConnectButton className={`${classNames.baseButton} ${classNames.activeButton}`}>
          <Button
            loading={inTransaction2}
            className={`${classNames.baseButton} ${classNames.activeButton}`}
            onClick={async () => {
              const txHash = await handleClaimAndReStake({
                isActive,
                keyThatTokenIdIn: incentive,
                currentIncentiveKey: currentIncentiveKey,
                tokenId: id,
                pid,
                accountAddress: account as string,
              });

              setTimeout(() => {
                hidePopup();
              }, 200);

              addRecordToHistory({
                txHash,
                type: 'MyFarms_ClaimAndStake',
              });
            }}
          >
            {i18n.claimAndStake}
          </Button>
        </AuthConnectButton>
      </div>
    </div>
  );
};

const showClaimAndUnstakeModal = (data: ModalType) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    ConfirmContent: (props: ConfirmModalInnerProps) => (
      <Suspense fallback={<Spin className="!block mx-auto text-60px" />}>
        <ClaimAndUnstakeModal {...data} {...props} />
      </Suspense>
    ),
    className: '!max-w-572px !min-h-466px',
  });
};

export default showClaimAndUnstakeModal;
