import React, { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import useI18n, { toI18n, compiled } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import { TokenVST } from '@service/tokens';
import AuthTokenButton from '@modules/AuthTokenButton';
import Button from '@components/Button';
import { VotingEscrowContract } from '@contracts/index';
import useInTranscation from '@hooks/useInTranscation';
import { handleStakingVST as _handleStakingVST } from '@service/staking';
import { useAccount } from '@service/account';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as DoubleArrowIcon } from '@assets/icons/double_arrow.svg';
import { ReactComponent as LogoIcon } from '@assets/icons/logo_icon.svg';

const transitions = {
  en: {
    title: 'Stake LP',
    subTitle: 'CFX / USDC Positions (Out of range LP can not receive farming rewards)',
    liquidity: 'Liquidity:',
    inRange: 'In Range',
    outOfRange: 'Out of Range',
    min: 'Min:',
    max: 'Max:',
    pair: '{count} {token1} per {token2}',
    stakeLP: 'Stake LP',
    more: 'Get more CFX/USDC LP ',
    null: 'Don’t have any LP in this pool.',
    provide: 'Provide liquidity for CFX/USDC',
  },
  zh: {
    title: '质押 LP',
    subTitle: 'CFX / USDC Positions (Out of range LP can not receive farming rewards)',
    liquidity: 'Liquidity:',
    inRange: 'In Range',
    outOfRange: 'Out of Range',
    min: 'Min:',
    max: 'Max:',
    pair: '{count} {token1} per {token2}',
    stakeLP: 'Stake LP',
    more: 'Get more CFX/USDC LP',
    null: 'Don’t have any LP in this pool.',
    provide: 'Provide liquidity for CFX/USDC',
  },
} as const;

export enum ModalMode {
  Unknown,
  CreateLock,
  IncreaseAmount,
  IncreaseUnlockTime,
}

interface CommonProps {
  type?: ModalMode;
  currentUnlockTime?: number;
}
type Props = ConfirmModalInnerProps & CommonProps;

const StakeModal: React.FC<Props> = ({ setNextInfo, type, currentUnlockTime }) => {
  const i18n = useI18n(transitions);

  const classNameLink = 'font-500 font-not-italic text-14px leading-18px color-orange-normal underline mt-4 text-center cursor-pointer';

  const FAKED_DATA = [1, 2, 3, 4, 5, 6, 7, 8];
  // const FAKED_DATA: any[] = [];

  if (FAKED_DATA.length === 0) {
    return (
      <div className="mt-24px min-h-318px !flex flex-col items-center justify-center">
        <LogoIcon className="-mt-8"></LogoIcon>
        <div className="text-22px leading-28px font-400 font-not-italic mt-8">{i18n.null}</div>
        <a className={classNameLink}>{i18n.provide}</a>
      </div>
    );
  } else {
    return (
      <div className="mt-24px">
        <div className="max-h-454px min-h-318px overflow-y-auto">
          {FAKED_DATA.map((t) => {
            const isInRange = t < 4;

            return (
              <div className="rounded-4 bg-orange-light-hover p-4 flex justify-between items-center mb-4" key={t}>
                <div>
                  <div>
                    <span className="font-400 font-not-italic text-14px leading-18px color-gray-normal mr-0.5">{i18n.liquidity}</span>
                    <span className="font-500 font-not-italic text-14px leading-18px color-black-normal mr-2">${numFormat(t + '00000')}</span>
                    {isInRange ? (
                      <>
                        <span className="color-green-normal font-500 font-not-italic text-12px leading-15px mr-1">{i18n.inRange}</span>
                        <span className="i-material-symbols:check-circle-rounded color-green-normal w-18px h-18px"></span>
                      </>
                    ) : (
                      <>
                        <span className="color-orange-dot font-500 font-not-italic text-12px leading-15px mr-1">{i18n.outOfRange}</span>
                        <span className="i-ep:warn-triangle-filled color-orange-dot w-18px h-18px"></span>
                      </>
                    )}
                  </div>
                  <div>
                    <span className="font-500 font-not-italic text-12px leading-15px color-gray-normal mr-0.5">{i18n.min}</span>
                    <span className="font-500 font-not-italic text-12px leading-18px color-black-normal mr-2">
                      {compiled(i18n.pair, { count: '1', token1: 'BTC', token2: 'CFX' })}
                    </span>
                    <span className="mr-2">
                      <DoubleArrowIcon></DoubleArrowIcon>
                    </span>
                    <span className="font-500 font-not-italic text-12px leading-15px color-gray-normal mr-0.5">{i18n.max}</span>
                    <span className="font-500 font-not-italic text-12px leading-18px color-black-normal mr-2">
                      {compiled(i18n.pair, { count: '∞', token1: 'BTC', token2: 'CFX' })}
                    </span>
                  </div>
                </div>
                <a className="inline-flex items-center justify-center px-6 h-8 border-2 border-solid rounded-full leading-18px font-500 not-italic color-orange-normal cursor-pointer">
                  {i18n.stakeLP}
                </a>
              </div>
            );
          })}
        </div>
        <div className={classNameLink}>{i18n.more}</div>
      </div>
    );
  }
};

const showStakeLPModal = (type: ModalMode) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    subTitle: toI18n(transitions).subTitle,
    ConfirmContent: (props: Props) => <StakeModal type={type} {...props} />,
    className: '!max-w-572px !min-h-466px',
  });
};

export default showStakeLPModal;
