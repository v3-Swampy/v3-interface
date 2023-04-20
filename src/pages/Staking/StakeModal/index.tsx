import React, { useCallback, useMemo } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { useForm } from 'react-hook-form';
import useI18n, { toI18n, compiled } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import { TokenVST } from '@service/tokens';
import AuthTokenButton from '@modules/AuthTokenButton';
import Button from '@components/Button';
import { VotingEscrowContract } from '@contracts/index';
import useInTransaction from '@hooks/useInTransaction';
import { handleStakingVST as _handleStakingVST, useBoostFactor } from '@service/staking';
import AmountInput from './AmountInput';
import DurationSelect, { defaultDuration } from './DurationSelect';
import { useAccount } from '@service/account';
import dayjs from 'dayjs';

const transitions = {
  en: {
    title: 'Stake VST',
    confirm: 'Confirm',
    current_boosting: 'Your Current Boosting: <b>{boosting}</b>',
  },
  zh: {
    title: '质押 VST',
    confirm: '确认',
    current_boosting: 'Your Current Boosting: <b>{boosting}</b>',
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
  const disabledAmount = type === ModalMode.IncreaseUnlockTime;
  const disabledLocktime = type === ModalMode.IncreaseAmount;
  const { register, handleSubmit: withForm, setValue, watch } = useForm();
  const currentStakeDuration = watch('VST-stake-duration', defaultDuration);
  const stakeAmount = watch('VST-stake-amount');
  const account = useAccount();
  const boostingFactor = useBoostFactor();
  const { inTransaction, execTransaction: handleStakingVST } = useInTransaction(_handleStakingVST);

  const modalMode = useMemo(() => {
    if (!disabledAmount && !disabledLocktime) return ModalMode.CreateLock;
    if (!!disabledAmount) return ModalMode.IncreaseUnlockTime;
    return ModalMode.IncreaseAmount;
  }, [disabledAmount, disabledLocktime]);

  const onSubmit = useCallback(
    withForm(async (data) => {
      const extendDuration = data['VST-stake-duration'];
      const extendDurationText = data['VST-stake-duration-text']
      const addAmount = data['VST-stake-amount']
      let methodName: 'createLock' | 'increaseUnlockTime' | 'increaseAmount', methodParams;
      let unlockTime = dayjs(currentUnlockTime ? currentUnlockTime * 1000 : undefined).unix() + extendDuration;
      let amount = '0x0';
      switch (modalMode) {
        case ModalMode.CreateLock:
          amount = Unit.fromStandardUnit(addAmount, TokenVST.decimals).toHexMinUnit();
          methodName = 'createLock';
          methodParams = [amount, unlockTime];
          break;
        case ModalMode.IncreaseUnlockTime:
          methodName = 'increaseUnlockTime';
          methodParams = [unlockTime];
          break;
        case ModalMode.IncreaseAmount:
          amount = Unit.fromStandardUnit(addAmount, TokenVST.decimals).toHexMinUnit();
          methodName = 'increaseAmount';
          methodParams = [account, amount];
          break;
      }
      try {
        const txHash = await handleStakingVST({
          methodName,
          methodParams,
        });

        setNextInfo({
          txHash,
          recordParams: {
            type: methodName === 'createLock' ? 'Stake_CreateLock' : methodName === 'increaseUnlockTime' ? 'Stake_IncreaseUnlockTime' : 'Stake_IncreaseAmount',
            tokenA_Value: methodName !== 'increaseUnlockTime' ? addAmount : extendDurationText,
            tokenA_Address: methodName !== 'increaseUnlockTime' ? TokenVST.address : '',
          },
        });
      } catch (err) {
        console.error('Create stake VST transaction failed: ', err);
      }
    }),
    []
  );

  if (!TokenVST) return null;
  return (
    <div className="mt-24px">
      <form onSubmit={onSubmit}>
        {!disabledAmount && <AmountInput register={register} setValue={setValue} TokenVST={TokenVST} />}
        {!disabledLocktime && <DurationSelect register={register} setValue={setValue} currentStakeDuration={currentStakeDuration} currentUnlockTime={currentUnlockTime} />}
        <p
          className="pl-8px mt-16px w-full font-normal text-black-normal"
          dangerouslySetInnerHTML={{ __html: compiled(i18n.current_boosting, { boosting: `${boostingFactor}x` }) }}
        />
        <AuthTokenButton {...buttonProps} tokenAddress={TokenVST.address} contractAddress={VotingEscrowContract.address} amount={stakeAmount}>
          <Button {...buttonProps} loading={inTransaction}>
            {i18n.confirm}
          </Button>
        </AuthTokenButton>
      </form>
    </div>
  );
};

const buttonProps = {
  color: 'orange',
  fullWidth: true,
  className: 'mt-24px h-48px rounded-100px text-16px font-bold',
} as const;

const showStakeModal = (type: ModalMode, currentUnlockTime?: number) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    ConfirmContent: (confirmModalInnerProps: ConfirmModalInnerProps) => <StakeModal type={type} currentUnlockTime={currentUnlockTime} {...confirmModalInnerProps} />,
    className: '!max-w-572px',
  });
};

export default showStakeModal;
