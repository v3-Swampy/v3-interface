import React, { Suspense } from 'react';
import useI18n, { toI18n } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import Spin from '@components/Spin';
import Button from '@components/Button';
import { handleUnstake as _handleUnstake } from '@service/farming';
import { useAccount } from '@service/account';
import useInTransaction from '@hooks/useInTransaction';
import { addRecordToHistory } from '@service/history';
import { PositionForUI } from '@service/position';
import { hidePopup } from '@components/showPopup';
import { ReactComponent as WarningIcon } from '@assets/icons/warning2.svg';
import AuthConnectButton from '@modules/AuthConnectButton';

const transitions = {
  en: {
    title: 'Unstake',
    info: 'Unstaking your LP before reward claiming opens will forfeit all earned rewards.',
    cancel: 'Cancel',
    claimAndStake: 'Unstake',
    confirmInfo: 'Are you sure you want to Unstake?',
  },
  zh: {
    title: 'Unstake',
    info: 'Unstaking your LP before reward claiming opens will forfeit all earned rewards.',
    cancel: 'Cancel',
    claimAndStake: 'Unstake',
    confirmInfo: 'Are you sure you want to Unstake?',
  },
} as const;

type Props = Parameters<typeof _handleUnstake>[0] & { position: PositionForUI };

const UnstakeModal: React.FC<Props & ConfirmModalInnerProps> = ({ tokenId, stakedIncentiveKeys, position, rewards }) => {
  const i18n = useI18n(transitions);
  const account = useAccount();
  // @ts-ignore
  const { inTransaction, execTransaction: handleUnstake } = useInTransaction(_handleUnstake, true);

  const classNames = {
    baseButton:
      'w-258px h-48px text-gray-normal font-normal font-not-italic text-16px flex items-center justify-center color-gray-normal rounded-full cursor-pointer lt-mobile:w-164px lt-mobile:h-40px lt-mobile:text-14px lt-mobile:leading-18px',
    activeButton: 'color-white-normal bg-orange-normal',
  };

  return (
    <div className="mt-24px min-h-318px !flex flex-col items-center justify-center lt-mobile:relative lt-mobile:min-h-400px">
      <WarningIcon className="-mt-8 lt-mobile:w-100px lt-mobile:h-100px"></WarningIcon>
      <div className="text-18px leading-30px font-normal mt-24px mx-80px lt-mobile:mx-64px lt-mobile:text-14px lt-mobile:leading-18px">{i18n.info}</div>

      <div className="absolute bottom-6 left-4 right-4 lt-mobile:left-0 lt-mobile:right-0">
        <div className="text-12px leading-20px color-gray-normal text-center mb-2">{i18n.confirmInfo}</div>
        <div className="flex justify-between lt-mobile:justify-around">
          <AuthConnectButton className={`${classNames.baseButton} border border-solid bg-white-normal`}>
            <Button
              color="gray"
              className={`${classNames.baseButton} border border-solid bg-white-normal`}
              onClick={async () => {
                hidePopup();
              }}
            >
              {i18n.cancel}
            </Button>
          </AuthConnectButton>
          <AuthConnectButton className={`${classNames.baseButton} ${classNames.activeButton}`}>
            <Button
              loading={inTransaction}
              className={`${classNames.baseButton} ${classNames.activeButton}`}
              onClick={async () => {
                const txHash = await handleUnstake({
                  tokenId,
                  stakedIncentiveKeys,
                  rewards,
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
          </AuthConnectButton>
        </div>
      </div>
    </div>
  );
};

const showUnstakeModal = (data: Props) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    ConfirmContent: (props: ConfirmModalInnerProps) => (
      <Suspense fallback={<Spin className="!block mx-auto text-60px" />}>
        <UnstakeModal {...data} {...props} />
      </Suspense>
    ),
    className: '!max-w-572px !min-h-466px',
  });
};

export default showUnstakeModal;
