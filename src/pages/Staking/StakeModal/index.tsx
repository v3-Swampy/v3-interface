import React, { useCallback,useMemo } from 'react';
import { useForm } from 'react-hook-form';
import useI18n, { toI18n } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import { TokenVST } from '@service/tokens';
import AuthTokenButton from '@modules/AuthTokenButton';
import Button from '@components/Button';
import { VotingEscrowContract } from '@contracts/index';
import useInTranscation from '@hooks/useInTranscation';
import { handleStakingVST as _handleStakingVST } from '@service/staking';
import AmountInput from './AmountInput';
import DurationSelect,{ defaultDuration } from './DurationSelect';
import { useAccount } from '@service/account';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';


const transitions = {
  en: {
    title: 'Stake VST',
    confirm: 'Confirm',
  },
  zh: {
    title: '质押 VST',
    confirm: '确认',
  },
} as const;

export enum ModalMode{
  Unknown,
  CreateLock,
  IncreaseAmount,
  IncreaseUnlockTime,
}

interface CommonProps{
  type?:ModalMode;
  currentUnlockTime?:number;
}
type Props=ConfirmModalInnerProps&CommonProps

const StakeModal: React.FC<Props> = ({ setNextInfo,type,currentUnlockTime }) => {
  const i18n = useI18n(transitions);
  const disabledAmount=type===ModalMode.IncreaseUnlockTime
  const disabledLocktime=type===ModalMode.IncreaseAmount
  const { register, handleSubmit: withForm, setValue, watch } = useForm();
  const currentStakeDuration = watch('VST-stake-duration',defaultDuration);
  const stakeAmount = watch('VST-stake-amount');
  const account = useAccount();

  const { inTranscation, execTranscation: handleStakingVST } = useInTranscation(_handleStakingVST);

  const modalMode = useMemo(() => {
    if (!disabledAmount && !disabledLocktime) return ModalMode.CreateLock
    if (!!disabledAmount) return ModalMode.IncreaseUnlockTime
    return ModalMode.IncreaseAmount
  }, [disabledAmount, disabledLocktime])

  const onSubmit = useCallback(
    withForm(async (data) => {
      let methodName,methodParams;
      let unlockTime=Math.ceil(new Date().valueOf() / 1000)+currentStakeDuration
      let amount= Unit.fromStandardUnit(data['VST-stake-amount'], TokenVST!.decimals).toHexMinUnit(); 
      switch(modalMode){
        case ModalMode.CreateLock:
          methodName='createLock'
          methodParams=[amount, unlockTime]
          break;
        case ModalMode.IncreaseUnlockTime:
          methodName='increaseUnlockTime'
          unlockTime = currentUnlockTime && currentStakeDuration ? currentUnlockTime + currentStakeDuration : null
          methodParams=[unlockTime]
          break;
        case ModalMode.IncreaseAmount:
          methodName='increaseAmount'
          methodParams=[account,amount]
          break;    
      }
      try {
        const txHash = await handleStakingVST({
          methodName,methodParams
        });
        txHash &&setNextInfo&&setNextInfo({ txHash, action: `Stake <strong>${data['VST-stake-amount']}</strong> VST` });
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
        {!disabledAmount&&<AmountInput register={register} setValue={setValue} TokenVST={TokenVST} />}
        {!disabledLocktime&&<DurationSelect register={register} setValue={setValue} currentStakeDuration={currentStakeDuration} />}

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
  color: 'gradient',
  fullWidth: true,
  className: 'mt-26px h-36px rounded-10px text-14px',
} as const;

const showStakeModal = (type:ModalMode) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    ConfirmContent:(props: Props)=> <StakeModal type={type} {...props} />,
    className: '!max-w-572px !min-h-466px',
  });
};

export default showStakeModal;
