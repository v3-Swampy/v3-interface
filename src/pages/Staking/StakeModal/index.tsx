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
import { handleStakingVST as _handleStakingVST, useVEMaxTime, useVETotalSupply, useUserInfo } from '@service/staking';
import AmountInput from './AmountInput';
import DurationSelect, { defaultDuration } from './DurationSelect';
import { useAccount } from '@service/account';
import dayjs from 'dayjs';

const transitions = {
  en: {
    title: 'Stake VST',
    confirm: 'Confirm',
    current_boosting: 'Your Boosting will be: <b>{boosting}</b>',
  },
  zh: {
    title: '质押 VST',
    confirm: '确认',
    current_boosting: 'Your Current will be: <b>{boosting}</b>',
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

const StakeModal: React.FC<Props> = ({ setNextInfo, type }) => {
  const i18n = useI18n(transitions);
  const [lockedAmount, currentUnlockTime] = useUserInfo();
  const disabledAmount = type === ModalMode.IncreaseUnlockTime;
  const disabledLockTime = type === ModalMode.IncreaseAmount;
  const { register, handleSubmit: withForm, setValue, watch } = useForm();
  const currentStakeDuration = watch('VST-stake-duration', defaultDuration);
  const stakeAmount = watch('VST-stake-amount', 0);
  const maxTime = useVEMaxTime()
  const veTotalSupply = useVETotalSupply()
  const account = useAccount();
  const { inTransaction, execTransaction: handleStakingVST } = useInTransaction(_handleStakingVST);

  const modalMode = useMemo(() => {
    if (!disabledAmount && !disabledLockTime) return ModalMode.CreateLock;
    if (!!disabledAmount) return ModalMode.IncreaseUnlockTime;
    return ModalMode.IncreaseAmount;
  }, [disabledAmount, disabledLockTime]);

  const boosting = useMemo(() => {
    // for estimating boosting:
    //   amount of veVST = lockAmount * (lockDuration/maxTime)
    //   total veVST     = VEContract.totalSupply() + amount of veVST
    //   boosting factor = (67% * <amount of veVST> /<total veVST> + 33%) / 33%
    let totalStakeAmount = new Unit(0)
    let duration: number = currentStakeDuration
    switch (modalMode) {
      case ModalMode.CreateLock:
        totalStakeAmount = new Unit(lockedAmount)
        duration = currentStakeDuration
        break;
      case ModalMode.IncreaseAmount:
        totalStakeAmount = new Unit(lockedAmount).add(stakeAmount)
        duration = currentUnlockTime - dayjs().unix()
        break;
      case ModalMode.IncreaseUnlockTime:
        totalStakeAmount = new Unit(lockedAmount)
        duration = currentUnlockTime - dayjs().unix() + currentStakeDuration
        break;
    }
    const userVeVST = maxTime ? totalStakeAmount.mul(duration).div(maxTime) : new Unit(0)
    const userVeVST_decimals = Unit.fromStandardUnit(userVeVST, TokenVST.decimals)
    const _totalSupply = new Unit(veTotalSupply || 0).add(userVeVST_decimals).toDecimalStandardUnit(undefined, TokenVST.decimals)
    return new Unit(userVeVST).mul(0.67).div(_totalSupply).add(0.33).div(0.33).toDecimalMinUnit(1)
  }, [stakeAmount, maxTime, currentStakeDuration, modalMode, lockedAmount, currentUnlockTime])

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
        {!disabledLockTime && <DurationSelect register={register} setValue={setValue} currentStakeDuration={currentStakeDuration} currentUnlockTime={currentUnlockTime} />}
        <p
          className="pl-8px mt-16px w-full font-normal text-black-normal"
          dangerouslySetInnerHTML={{ __html: compiled(i18n.current_boosting, { boosting: `${boosting}x` }) }}
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

const showStakeModal = (type: ModalMode) => {
  showConfirmTransactionModal({
    title: toI18n(transitions).title,
    ConfirmContent: (confirmModalInnerProps: ConfirmModalInnerProps) => <StakeModal type={type} {...confirmModalInnerProps} />,
    className: '!max-w-572px',
  });
};

export default showStakeModal;
