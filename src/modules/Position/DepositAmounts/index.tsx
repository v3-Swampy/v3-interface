import React, { memo, useRef, useMemo, useLayoutEffect } from 'react';
import { type UseFormRegister, type UseFormSetValue, type UseFormGetValues, type FieldValues } from 'react-hook-form';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import Input, { defaultDynamicFontSize } from '@components/Input';
import Button from '@components/Button';
import Balance from '@modules/Balance';
import { isTokenEqual, type Token } from '@service/tokens';
import { useAccount } from '@service/account';
import { usePool, FeeAmount, invertPrice, getMaxTick, getMinTick, calcPriceFromTick } from '@service/pairs&pool';
import useI18n from '@hooks/useI18n';
import { trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as LockIcon } from '@assets/icons/lock.svg';

const transitions = {
  en: {
    deposit_amounts: 'Deposit Amounts',
    balance: 'Balance',
    max: 'Max',
    outof_range: 'The market price is outside your specified price range. Single-asset deposit only.',
    outof_range_tip: 'Your position will not earn fees or be used in trades until the market price moves into your range.',
  },
  zh: {
    deposit_amounts: '存入金额',
    balance: '余额',
    max: '最大值',
    outof_range: '市场兑换率超出您指定的范围。将只注入单项代币。',
    outof_range_tip: '您的仓位在市场兑换率变化进入到您设置的范围内之前不会赚取手续费或被用于进行兑换交易。',
  },
} as const;

interface Props {
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  getValues: UseFormGetValues<FieldValues>;
  /** When creating Position, the lower price may be greater than the upper price.
   * However, when creating and removing, it is definitely true.
   * */
  isRangeValid: boolean | null;
  /**
   * When creating Position, pool may not exist.
   * So there will be a manually entered priceInit value
   */
  priceInit?: string;
  title?: string;
  priceLower: Unit | string | undefined;
  priceUpper: Unit | string | undefined;
  tokenA: Token | null | undefined;
  tokenB: Token | null | undefined;
  fee: FeeAmount | undefined;
}

const DepositAmount: React.FC<
  Pick<Props, 'register' | 'setValue' | 'isRangeValid' | 'fee' | 'tokenA' | 'getValues'> & {
    token: Token | null | undefined;
    pairToken: Token | null | undefined;
    type: 'tokenA' | 'tokenB';
    priceTokenA: Unit | null | undefined;
    priceLower: Unit | undefined;
    priceUpper: Unit | undefined;
    isValidToInput: boolean;
    isOutOfRange: boolean;
    isPairTokenOutOfRange: boolean;
  }
> = ({ type, tokenA, token, pairToken, priceTokenA, isRangeValid = true, isOutOfRange, isPairTokenOutOfRange, priceLower, priceUpper, fee, getValues, register, setValue }) => {
  const i18n = useI18n(transitions);
  const account = useAccount();
  const pairKey = `amount-${type === 'tokenA' ? 'tokenB' : 'tokenA'}`;

  const changePairAmount = useRef<(newAmount: string) => void>(() => {});
  useLayoutEffect(() => {
    changePairAmount.current = (newAmount: string) => {
      if (!priceTokenA || !priceLower || !priceUpper || !token || !pairToken || !fee) return;
      if (!newAmount || isPairTokenOutOfRange || !pairToken || !token || !pairToken) {
        setValue(pairKey, '');
        return;
      }
      const usedPriceLower = priceLower.equals(0) ? calcPriceFromTick({ fee, tokenA: token, tokenB: pairToken, tick: getMinTick(fee), convertLimit: false }) : priceLower;
      const usedPriceUpper = !priceUpper.isFinite() ? calcPriceFromTick({ fee, tokenA: token, tokenB: pairToken, tick: getMaxTick(fee), convertLimit: false }) : priceUpper;
      // const usedPriceLower = calcPriceFromTick({ fee, tokenA: token, tokenB: pairToken, tick: -6600, convertLimit: false });
      // const usedPriceUpper = calcPriceFromTick({ fee, tokenA: token, tokenB: pairToken, tick: 60, convertLimit: false });
      // console.log(usedPriceLower?.toDecimalMinUnit(), usedPriceUpper?.toDecimalMinUnit())

      const isThisTokenEqualsTokenA = isTokenEqual(token, tokenA);
      const currentInputAmount = new Unit(newAmount);
      const temp = new Unit(1).div(priceTokenA.sqrt()).sub(new Unit(1).div(usedPriceUpper.sqrt())).div(priceTokenA.sqrt().sub(usedPriceLower.sqrt()));
      const pairTokenExpectedAmount = currentInputAmount.mul(!isThisTokenEqualsTokenA ? temp : invertPrice(temp));
      setValue(pairKey, trimDecimalZeros(pairTokenExpectedAmount.toDecimalMinUnit(pairToken?.decimals)));
    };
  }, [fee, priceTokenA, priceLower, priceUpper, isPairTokenOutOfRange, token?.address, pairToken?.address]);

  const priceTokenAFixed8 = useMemo(() => (priceTokenA ? priceTokenA.toDecimalMinUnit(8) : null), [priceTokenA]);
  const priceLowerAFixed8 = useMemo(() => (priceLower ? priceLower.toDecimalMinUnit(8) : null), [priceLower]);
  const priceUpperAFixed8 = useMemo(() => (priceUpper ? priceUpper.toDecimalMinUnit(8) : null), [priceUpper]);
  useLayoutEffect(() => {
    if (type === 'tokenB') return;
    const value = getValues();
    const amountTokenA = value['amount-tokenA'];
    if (!priceTokenA || !amountTokenA) {
      setValue('amount-tokenB', '');
      return;
    }
    changePairAmount.current(amountTokenA);
  }, [priceTokenAFixed8, priceLowerAFixed8, priceUpperAFixed8]);

  useLayoutEffect(() => {
    const value = getValues();
    const currentAmount = value[`amount-${type}`];
    if (isPairTokenOutOfRange) {
      setValue(pairKey, '');
    } else {
      if (!priceTokenA) return;
      changePairAmount.current(currentAmount);
    }
  }, [isPairTokenOutOfRange]);

  useLayoutEffect(() => {
    setValue(`amount-${type}`, '');
  }, [fee]);

  return (
    <div className={cx('mt-4px h-84px rounded-16px bg-orange-light-hover', !isOutOfRange ? 'pt-8px pl-16px pr-8px' : 'flex flex-col justify-center items-center px-24px')}>
      {!isOutOfRange && (
        <>
          <div className="flex justify-between items-center">
            <Input
              className="text-24px pr-32px lt-mobile:text-16px"
              clearIcon
              disabled={!isRangeValid}
              placeholder="0"
              id={`input--${type}-amount`}
              type="number"
              {...register(`amount-${type}`, {
                required: true,
                min: new Unit(1).toDecimalStandardUnit(undefined, token?.decimals),
              })}
              min={new Unit(1).toDecimalStandardUnit(undefined, token?.decimals)}
              step={new Unit(1).toDecimalStandardUnit(undefined, token?.decimals)}
              onBlur={(evt) => changePairAmount.current(evt.target.value)}
              decimals={token?.decimals}
              dynamicFontSize={defaultDynamicFontSize}
              preventMinus
            />

            {token && (
              <div className="flex-shrink-0 ml-14px flex items-center min-w-80px h-40px px-8px rounded-100px bg-orange-light text-14px text-black-normal font-normal">
                {<img className="w-24px h-24px mr-4px" src={token.logoURI} alt={`${token.symbol} logo`} />}
                {token.symbol}
              </div>
            )}
          </div>

          {account && token && (
            <div className="mt-8px ml-auto flex items-center w-fit h-20px text-14px text-gray-normal">
              {i18n.balance}:{' '}
              <Balance className="ml-2px" address={token.address} decimals={token.decimals} id={`${type}-balance`}>
                {(balance) => (
                  <Button
                    className="ml-12px px-8px h-20px rounded-4px text-14px font-normal border-1px! hover:bg-orange-normal hover:text-white-normal!"
                    variant='outlined'
                    color="orange"
                    disabled={!balance || balance === '0'}
                    onClick={() => {
                      setValue(`amount-${type}`, balance);
                      changePairAmount.current(balance ?? '');
                    }}
                    type="button"
                    id={`${type}-max-button`}
                  >
                    {i18n.max}
                  </Button>
                )}
              </Balance>
            </div>
          )}
        </>
      )}

      {isOutOfRange && (
        <>
          <LockIcon className="w-20px h-24px" />
          <p className="mt-4px text-center text-12px text-gray-normal">{i18n.outof_range}</p>
        </>
      )}
    </div>
  );
};

const DepositAmounts: React.FC<Props> = ({
  tokenA,
  tokenB,
  fee,
  title,
  isRangeValid,
  priceInit,
  priceLower: _priceLower,
  priceUpper: _priceUpper,
  setValue,
  getValues,
  register,
}) => {
  const i18n = useI18n(transitions);
  const priceLower = useMemo(() => {
    try {
      return _priceLower ? new Unit(_priceLower) : undefined;
    } catch (_) {
      return undefined;
    }
  }, [_priceLower]);
  const priceUpper = useMemo(() => {
    try {
      return _priceUpper ? new Unit(_priceUpper) : undefined;
    } catch (_) {
      return undefined;
    }
  }, [_priceUpper]);

  const { pool } = usePool({ tokenA, tokenB, fee });

  const priceTokenA = useMemo(
    () => (pool === null ? (priceInit && !Number.isNaN(Number(priceInit)) ? new Unit(priceInit) : null) : pool?.priceOf(tokenA!)),
    [tokenA?.address, pool, priceInit]
  );

  const isValidToInput = !!priceTokenA && !!tokenA && !!tokenB && !!isRangeValid;
  const isPriceLowerGreaterThanCurrentPrice = priceTokenA && priceLower && !priceLower.isNaN() ? priceTokenA.lessThanOrEqualTo(priceLower) : false;
  const isPriceUpperLessThanCurrentPrice = priceTokenA && priceUpper && !priceUpper.isNaN() ? priceTokenA.greaterThanOrEqualTo(priceUpper) : false;

  const account = useAccount();
  useLayoutEffect(() => {
    setValue('amount-tokenA', '');
    setValue('amount-tokenB', '');
  }, [tokenA?.address, tokenB?.address, account]);

  return (
    <div className={cx('mt-24px', !isValidToInput && 'opacity-50 pointer-events-none')}>
      <p className="mb-8px leading-18px text-14px text-black-normal ml-8px font-normal">{title || i18n.deposit_amounts}</p>
      <DepositAmount
        tokenA={tokenA}
        token={tokenA}
        pairToken={tokenB}
        type="tokenA"
        priceTokenA={priceTokenA}
        priceLower={priceLower}
        priceUpper={priceUpper}
        isValidToInput={isValidToInput}
        isOutOfRange={isPriceUpperLessThanCurrentPrice}
        isPairTokenOutOfRange={isPriceLowerGreaterThanCurrentPrice}
        setValue={setValue}
        register={register}
        getValues={getValues}
        isRangeValid={isRangeValid}
        fee={fee}
      />
      <DepositAmount
        tokenA={tokenA}
        token={tokenB}
        pairToken={tokenA}
        type="tokenB"
        priceTokenA={priceTokenA}
        priceLower={priceLower}
        priceUpper={priceUpper}
        isValidToInput={isValidToInput}
        isOutOfRange={isPriceLowerGreaterThanCurrentPrice}
        isPairTokenOutOfRange={isPriceUpperLessThanCurrentPrice}
        setValue={setValue}
        register={register}
        getValues={getValues}
        isRangeValid={isRangeValid}
        fee={fee}
      />
    </div>
  );
};

export default memo(DepositAmounts);
