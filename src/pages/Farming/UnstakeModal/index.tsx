import React, { Suspense } from 'react';
import useI18n, { toI18n, compiled } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import Spin from '@components/Spin';
import Button from '@components/Button';
import { type IncentiveKey } from '@service/farming';
import { handleClaimUnStake as _handleClaimUnStake, handleClaimAndReStake as _handleClaimAndReStake } from '@service/farming/myFarms';
import { useAccount } from '@service/account';
import useInTransaction from '@hooks/useInTransaction';
import { addRecordToHistory } from '@service/history';
import { PositionForUI } from '@service/position';
import { hidePopup } from '@components/showPopup';

const transitions = {
  en: {
    title: 'Warning',
    info: '<span class="text-orange-normal">No rewards</span> if you unstake {symbol0}/{symbol1} now!',
    claimAndUnstake: 'Cancel',
    claimAndStake: 'Unstake',
  },
  zh: {
    title: 'Warning',
    info: '<span class="text-orange-normal">No rewards</span> if you unstake {symbol0}/{symbol1} now!',
    claimAndUnstake: 'Cancel',
    claimAndStake: 'Unstake',
  },
} as const;

export enum ModalMode {
  Unknown,
  CreateLock,
  IncreaseAmount,
  IncreaseUnlockTime,
}

interface ModalType {
  isActive: boolean;
  incentive: any;
  id: number;
  pid: number;
  currentIncentiveKey: IncentiveKey;
  position: PositionForUI;
}

const UnstakeModal: React.FC<ModalType> = ({ isActive, incentive, id, pid, currentIncentiveKey, position }) => {
  const i18n = useI18n(transitions);
  const account = useAccount();
  // @ts-ignore
  const { inTransaction, execTransaction: handleClaimUnStake } = useInTransaction(_handleClaimUnStake, true);

  const classNames = {
    baseButton: 'w-258px h-48px text-gray-normal font-normal font-not-italic text-16px flex items-center justify-center color-gray-normal rounded-full cursor-pointer',
    activeButton: 'color-white-normal bg-orange-normal',
  };

  return (
    <div className="mt-24px min-h-218px !flex flex-col items-center justify-center">
      {/* <LogoIcon className="-mt-8"></LogoIcon> */}
      <div
        className="text-22px leading-28px font-400 font-not-italic -mt-8 w-120 text-center"
        dangerouslySetInnerHTML={{
          __html: compiled(i18n.info, { symbol0: position?.token0?.symbol, symbol1: position?.token1?.symbol }),
        }}
      ></div>
      <div className="absolute flex bottom-6 left-4 right-4 justify-between">
        <Button
          color="gray"
          className={`${classNames.baseButton} border border-solid bg-white-normal`}
          onClick={async () => {
            hidePopup();
          }}
        >
          {i18n.claimAndUnstake}
        </Button>
        <Button
          loading={inTransaction}
          className={`${classNames.baseButton} ${classNames.activeButton}`}
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
              type: 'MyFarms_Unstake',
            });
          }}
        >
          {i18n.claimAndStake}
        </Button>
      </div>
    </div>
  );
};

const showUnstakeModal = (data: ModalType) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    ConfirmContent: (props: ConfirmModalInnerProps) => (
      <Suspense fallback={<Spin className="!block mx-auto text-60px" />}>
        <UnstakeModal {...data} {...props} />
      </Suspense>
    ),
    className: '!max-w-572px !min-h-300px',
  });
};

export default showUnstakeModal;
