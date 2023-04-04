import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import useI18n, { toI18n } from '@hooks/useI18n';
import showConfirmTransactionModal, { type ConfirmModalInnerProps } from '@modules/ConfirmTransactionModal';
import { TokenVST } from '@service/tokens';
import AuthTokenButton from '@modules/AuthTokenButton';
import Button from '@components/Button';
import { UniswapV3Quoter } from '@contracts/index';
import useInTranscation from '@hooks/useInTranscation';
import { handleStakingVST as _handleStakingVST } from '@service/staking';
import AmountInput from './AmountInput';
import DurationSelect, { defaultDuration } from './DurationSelect';

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

const StakeModal: React.FC<ConfirmModalInnerProps> = ({ setNextInfo }) => {
  const i18n = useI18n(transitions);

  const { register, handleSubmit: withForm, setValue, watch } = useForm();
  const currentStakeDuration = watch('VST-stake-duration', defaultDuration);
  const stakeAmount = watch('VST-stake-amount', '');

  const { inTranscation, execTranscation: handleStakingVST } = useInTranscation(_handleStakingVST);

  const onSubmit = useCallback(
    withForm(async (data) => {
      try {
        const txHash = await handleStakingVST({
          amount: data['VST-stake-amount'],
          durationSeconds: data['VST-stake-duration'],
        });
        txHash && setNextInfo({ txHash, action: `Stake <strong>${data['VST-stake-amount']}</strong> VST` });
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
        <AmountInput register={register} setValue={setValue} TokenVST={TokenVST} />
        <DurationSelect register={register} setValue={setValue} currentStakeDuration={currentStakeDuration} />

        <AuthTokenButton {...buttonProps} tokenAddress={TokenVST.address} contractAddress={UniswapV3Quoter.address} amount={stakeAmount}>
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

const showStakeModal = () => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    ConfirmContent: StakeModal,
    className: '!max-w-572px !h-466px',
  });
};

export default showStakeModal;
