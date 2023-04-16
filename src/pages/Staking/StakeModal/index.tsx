import React, { useCallback, useMemo } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { useForm } from 'react-hook-form';
import useI18n, { toI18n, compiled } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import { TokenVST } from '@service/tokens';
import AuthTokenButton from '@modules/AuthTokenButton';
import Button from '@components/Button';
import { VotingEscrowContract } from '@contracts/index';
import useInTranscation from '@hooks/useInTranscation';
import { handleStakingVST as _handleStakingVST } from '@service/staking';
import AmountInput from './AmountInput';
import DurationSelect, { defaultDuration } from './DurationSelect';
import { useAccount } from '@service/account';
import {useBoostFactor} from '@service/staking'


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
  const boostingFactor=useBoostFactor()
  const { inTranscation, execTranscation: handleStakingVST } = useInTranscation(_handleStakingVST);

  const modalMode = useMemo(() => {
    if (!disabledAmount && !disabledLocktime) return ModalMode.CreateLock;
    if (!!disabledAmount) return ModalMode.IncreaseUnlockTime;
    return ModalMode.IncreaseAmount;
  }, [disabledAmount, disabledLocktime]);

  const onSubmit = useCallback(
    withForm(async (data) => {
      let methodName, methodParams;
      let unlockTime = Math.ceil(new Date().valueOf() / 1000) + currentStakeDuration;
      let amount = '0x0';
      let action = '';
      switch (modalMode) {
        case ModalMode.CreateLock:
          amount = Unit.fromStandardUnit(data['VST-stake-amount'], TokenVST.decimals).toHexMinUnit();
          methodName = 'createLock';
          methodParams = [amount, unlockTime];
          action = `Stake <b>${data['VST-stake-amount']}</b> VST`;
          break;
        case ModalMode.IncreaseUnlockTime:
          methodName = 'increaseUnlockTime';
          unlockTime = currentUnlockTime && currentStakeDuration ? +currentUnlockTime + +currentStakeDuration : null;
          methodParams = [unlockTime];
          action = `Extend UnLockTime`;
          break;
        case ModalMode.IncreaseAmount:
          amount = Unit.fromStandardUnit(data['VST-stake-amount'], TokenVST.decimals).toHexMinUnit();
          methodName = 'increaseAmount';
          methodParams = [account, amount];
          action = `Increase <b>${data['VST-stake-amount']}</b> VST`;
          break;
      }
      try {
        const txHash = await handleStakingVST({
          methodName,
          methodParams,
        });

        setNextInfo({ txHash, action: `${action}` });
      } catch (err) {
        console.error('Create stake VST transcation failed: ', err);
      }
    }),
    []
  );

  if (!TokenVST) return null;
  return (
    <div className="mt-24px">
      <form onSubmit={onSubmit}>
        {!disabledAmount && <AmountInput register={register} setValue={setValue} TokenVST={TokenVST} />}
        {!disabledLocktime && <DurationSelect register={register} setValue={setValue} currentStakeDuration={currentStakeDuration} />}
        <p className="pl-8px mt-16px w-full font-normal text-black-normal" dangerouslySetInnerHTML={{ __html: compiled(i18n.current_boosting, { boosting: `${boostingFactor}x` }) }} />
        <AuthTokenButton {...buttonProps} tokenAddress={TokenVST.address} contractAddress={VotingEscrowContract.address} amount={stakeAmount}>
          <Button {...buttonProps} loading={inTranscation}>
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
    className: '!max-w-572px !min-h-466px',
  });
};

export default showStakeModal;
