import React, { useCallback, useMemo, Suspense } from 'react';
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
import Spin from '@components/Spin';

const transitions = {
  en: {
    title: 'Stake VST',
    confirm: 'Confirm',
    current_boosting: 'Your estimated boost will be: <b>{boosting}</b>',
  },
  zh: {
    title: '质押 VST',
    confirm: '确认',
    current_boosting: 'Your estimated boost will be: <b>{boosting}</b>',
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
  const maxTime = useVEMaxTime();
  const veTotalSupply = useVETotalSupply();
  const account = useAccount();
  const { register, handleSubmit: withForm, setValue, watch } = useForm();

  const disabledAmount = type === ModalMode.IncreaseUnlockTime;
  const disabledLockTime = type === ModalMode.IncreaseAmount;
  const currentStakeDuration = watch('VST-stake-duration', defaultDuration);
  const stakeAmount = watch('VST-stake-amount', 0);

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

    // compare with current staked status,for example,
    //    CreateLock: when you come first time, the addedAmount will be the amount that you will enter
    //    IncreaseAmount: when you want to increase the amount only, the addedAmount will be the amount that you will enter
    //    IncreaseUnlockTime: the amount will be same, because you will not change the amount value.
    let addedStakeAmount: Unit = new Unit(0);
    let duration: number = currentStakeDuration;
    let addedUserVeVST: Unit = new Unit(0);
    switch (modalMode) {
      case ModalMode.CreateLock:
        addedStakeAmount = new Unit(stakeAmount || 0);
        // in this status, your lockedAmount will be 0.
        duration = currentStakeDuration;
        addedUserVeVST = maxTime ? addedStakeAmount.mul(duration).div(maxTime) : new Unit(0);
        break;
      case ModalMode.IncreaseAmount:
        addedStakeAmount = new Unit(stakeAmount || 0);
        duration = currentUnlockTime - dayjs().unix();
        addedUserVeVST = maxTime ? addedStakeAmount.mul(duration).div(maxTime) : new Unit(0);
        break;
      case ModalMode.IncreaseUnlockTime:
        addedStakeAmount = new Unit(0);
        duration = currentUnlockTime - dayjs().unix() + currentStakeDuration;
        //in this situation, the unlock time wiil be increased, so the previous and current veVST will be changed.
        addedUserVeVST = maxTime ? new Unit(lockedAmount).mul(currentStakeDuration).div(maxTime) : new Unit(0);
        break;
    }
    const totalStakeAmount = new Unit(lockedAmount).add(addedStakeAmount);
    const userVeVST = maxTime ? totalStakeAmount.mul(duration).div(maxTime) : new Unit(0);
    const addedUserVeVST_decimals = Unit.fromStandardUnit(addedUserVeVST, TokenVST.decimals);
    const _totalSupply = new Unit(veTotalSupply || 0).add(addedUserVeVST_decimals).toDecimalStandardUnit(undefined, TokenVST.decimals);
    return _totalSupply != '0' ? new Unit(userVeVST).mul(0.67).div(_totalSupply).add(0.33).div(0.33).toDecimalMinUnit(1) : 1.0;
  }, [stakeAmount, maxTime, currentStakeDuration, modalMode, lockedAmount, currentUnlockTime]);

  const onSubmit = useCallback(
    withForm(async (data) => {
      const extendDuration = data['VST-stake-duration'];
      const extendDurationText = data['VST-stake-duration-text'];
      const addAmount = data['VST-stake-amount'];
      let methodName: 'createLock' | 'increaseUnlockTime' | 'increaseAmount', methodParams: any;
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
        setNextInfo({
          sendTransaction: () =>
            handleStakingVST({
              methodName,
              methodParams,
            }),
          recordParams: {
            type: methodName === 'createLock' ? 'Stake_CreateLock' : methodName === 'increaseUnlockTime' ? 'Stake_IncreaseUnlockTime' : 'Stake_IncreaseAmount',
            tokenA_Value: methodName !== 'increaseUnlockTime' ? addAmount : extendDurationText,
            tokenA_Address: TokenVST.address,
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
    <div className="mt-24px flex flex-1 flex-col">
      <form onSubmit={onSubmit} className="flex flex-1 flex-col justify-between">
        <div>
          {!disabledAmount && <AmountInput register={register} setValue={setValue} TokenVST={TokenVST} />}
          {!disabledLockTime && <DurationSelect register={register} setValue={setValue} currentStakeDuration={currentStakeDuration} currentUnlockTime={currentUnlockTime} />}
          <p className="pl-8px mt-16px w-full font-normal text-black-normal" dangerouslySetInnerHTML={{ __html: compiled(i18n.current_boosting, { boosting: `${boosting}x` }) }} />
        </div>
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
    ConfirmContent: (confirmModalInnerProps: ConfirmModalInnerProps) => (
      <Suspense fallback={<Spin className="!block mx-auto text-60px" />}>
        <StakeModal type={type} {...confirmModalInnerProps} />
      </Suspense>
    ),
    className: '!max-w-572px !min-h-466px flex flex-col',
  });
};

export default showStakeModal;
