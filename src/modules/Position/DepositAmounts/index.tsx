import React, { memo, useMemo, useCallback, useLayoutEffect } from 'react';
import { type UseFormRegister, type UseFormSetValue, type UseFormGetValues, type FieldValues } from 'react-hook-form';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import Input from '@components/Input';
import Button from '@components/Button';
import Balance from '@modules/Balance';
import { isTokenEqual, type Token } from '@service/tokens';
import { useAccount } from '@service/account';
import { usePool, FeeAmount } from '@service/pairs&pool';
import useI18n from '@hooks/useI18n';
import { trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as LockIcon } from '@assets/icons/lock.svg';

const transitions = {
  en: {
    deposit_amounts: 'Deposit Amounts',
    select_token: 'Select Token',
    balance: 'Balance',
    max: 'MAX',
    outof_range: 'The market price is outside your specified price range. Single-asset deposit only.',
    outof_range_tip: 'Your position will not earn fees or be used in trades until the market price moves into your range.',
  },
  zh: {
    deposit_amounts: '存入金额',
    select_token: '选择代币',
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
  Pick<Props, 'register' | 'setValue' | 'isRangeValid'> & {
    token: Token | null;
    pairToken: Token | null;
    type: 'tokenA' | 'tokenB';
    price: Unit | null | undefined;
    isValidToInput: boolean;
    isOutOfRange: boolean;
    isPairTokenOutOfRange: boolean;
  }
> = ({ type, token, pairToken, price, isRangeValid = true, isOutOfRange, isPairTokenOutOfRange, register, setValue }) => {
  const i18n = useI18n(transitions);
  const account = useAccount();

  useLayoutEffect(() => {
    setValue(`amount-${type}`, '');
  }, [token?.address, account]);

  const changePairAmount = useCallback(
    (newAmount: string) => {
      if (!price) return;
      const pairKey = `amount-${type === 'tokenA' ? 'tokenB' : 'tokenA'}`;
      if (!newAmount || isPairTokenOutOfRange) {
        setValue(pairKey, '');
        return;
      }
      const currentInputAmount = new Unit(newAmount);
      const pairTokenExpectedAmount = currentInputAmount?.mul(price);
      setValue(pairKey, trimDecimalZeros(pairTokenExpectedAmount.toDecimalMinUnit(pairToken?.decimals)));
    },
    [type, price, pairToken, isPairTokenOutOfRange]
  );

  return (
    <div className={cx('mt-4px h-84px rounded-16px bg-orange-light-hover', !isOutOfRange ? 'pt-8px pl-16px pr-8px' : 'flex flex-col justify-center items-center px-24px')}>
      {!isOutOfRange && (
        <>
          <div className="flex justify-between items-center">
            <Input
              className="text-24px"
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
              onBlur={(evt) => changePairAmount(evt.target.value)}
            />

            <div className="flex-shrink-0 ml-14px flex items-center min-w-80px h-40px px-8px rounded-100px bg-orange-light text-14px text-black-normal font-medium cursor-pointer">
              {token && <img className="w-24px h-24px mr-4px" src={token.logoURI} alt={`${token.symbol} logo`} />}
              {token && token.symbol}
              {!token && i18n.select_token}
            </div>
          </div>

          {account && token && (
            <div className="mt-8px ml-auto flex items-center w-fit h-20px text-14px text-gray-normal">
              {i18n.balance}:{' '}
              <Balance className="ml-2px" address={token.address} decimals={token.decimals}>
                {(balance) => (
                  <Button
                    className="ml-12px px-8px h-20px rounded-4px text-14px font-medium"
                    color="orange"
                    disabled={!balance || balance === '0'}
                    onClick={() => {
                      setValue(`amount-${type}`, balance);
                      changePairAmount(balance ?? '');
                    }}
                    type="button"
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
  const priceLower = useMemo(() => (_priceLower ? new Unit(_priceLower) : undefined), [_priceLower]);
  const priceUpper = useMemo(() => (_priceUpper ? new Unit(_priceUpper) : undefined), [_priceUpper]);

  const { state, pool } = usePool({ tokenA, tokenB, fee });

  const priceTokenA = useMemo(
    () => (pool === null ? (priceInit && !Number.isNaN(Number(priceInit)) ? new Unit(priceInit) : null) : pool?.priceOf(tokenA!)),
    [tokenA?.address, pool, priceInit]
  );
  const priceTokenB = useMemo(() => (priceTokenA ? new Unit(1).div(priceTokenA) : null), [priceTokenA]);
  
  const isValidToInput = !!priceTokenA && !!tokenA && !!tokenB && !!isRangeValid;
  const isPriceLowerGreaterThanCurrentPrice = priceTokenA && priceLower && !priceLower.isNaN() ? priceTokenA.lessThan(priceLower) : false;
  const isPriceUpperLessThanCurrentPrice = priceTokenA && priceUpper && !priceUpper.isNaN() ? priceTokenA.greaterThan(priceUpper) : false;

  const token0PriceFixed5 = useMemo(() => (priceTokenA ? priceTokenA.toDecimalMinUnit(5) : null), [priceTokenA]);
  
  useLayoutEffect(() => {
    const value = getValues();
    const amountTokenA = value['amount-tokenA'];
    if (!priceTokenA || !amountTokenA) {
      setValue('amount-tokenB', '');
      return;
    }
    const tokenBExpectedAmount = new Unit(amountTokenA).mul(priceTokenA);
    setValue('amount-tokenB', trimDecimalZeros(tokenBExpectedAmount.toDecimalMinUnit(tokenB?.decimals)));
  }, [token0PriceFixed5]);

  useLayoutEffect(() => {
    if (isPriceLowerGreaterThanCurrentPrice) {
      setValue('amount-tokenB', '');
    }

    if (isPriceUpperLessThanCurrentPrice) {
      setValue('amount-tokenA', '');
    }
  }, [isPriceUpperLessThanCurrentPrice, isPriceLowerGreaterThanCurrentPrice]);

  if (!tokenA || !tokenB || !fee) return null;
  return (
    <div className={cx('mt-24px', !isValidToInput && 'opacity-50 pointer-events-none')}>
      <p className="mb-8px leading-18px text-14px text-black-normal ml-8px font-medium">{title || i18n.deposit_amounts}</p>
      <DepositAmount
        token={tokenA}
        pairToken={tokenB}
        type="tokenA"
        price={priceTokenA}
        isValidToInput={isValidToInput}
        isOutOfRange={isPriceUpperLessThanCurrentPrice}
        isPairTokenOutOfRange={isPriceLowerGreaterThanCurrentPrice}
        setValue={setValue}
        register={register}
        isRangeValid={isRangeValid}
      />
      <DepositAmount
        token={tokenB}
        pairToken={tokenB}
        type="tokenB"
        price={priceTokenB}
        isValidToInput={isValidToInput}
        isOutOfRange={isPriceLowerGreaterThanCurrentPrice}
        isPairTokenOutOfRange={isPriceUpperLessThanCurrentPrice}
        setValue={setValue}
        register={register}
        isRangeValid={isRangeValid}
      />
    </div>
  );
};

export default memo(DepositAmounts);
