import React, { memo, useMemo, useCallback, useLayoutEffect } from 'react';
import { type UseFormRegister, type UseFormSetValue, type UseFormGetValues, type FieldValues } from 'react-hook-form';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import Input from '@components/Input';
import Button from '@components/Button';
import Balance from '@modules/Balance';
import { type Token } from '@service/tokens';
import { useAccount } from '@service/account';
import { usePool } from '@service/pairs&pool';
import useI18n from '@hooks/useI18n';
import { trimDecimalZeros } from '@utils/numberUtils';
import { PositionForUI } from '@service/pool-manage';

// import { useTokenA, useTokenB } from '././SelectPair';
// import { useCurrentFee } from './SelectFeeTier';

const transitions = {
  en: {
    deposit_amounts: 'Deposit Amounts',
    select_token: 'Select Token',
    balance: 'Balance',
    max: 'MAX',
  },
  zh: {
    deposit_amounts: '存入金额',
    select_token: '选择代币',
    balance: '余额',
    max: '最大值',
  },
} as const;

interface Props {
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  getValues: UseFormGetValues<FieldValues>;
  isRangeValid: boolean | null;
  priceInit?: string;
}

const DepositAmount: React.FC<Props & { token: Token | null; pairToken: Token | null; type: 'tokenA' | 'tokenB'; price: Unit | null | undefined; isValidToInput: boolean }> = ({
  type,
  token,
  pairToken,
  price,
  isRangeValid,
  register,
  setValue,
}) => {
  const i18n = useI18n(transitions);
  const account = useAccount();

  useLayoutEffect(() => {
    setValue(`amount-${type}`, '');
  }, [token?.address, account]);

  const changePairAmount = useCallback(
    (newAmount: string) => {
      if (!price) return;
      const pairKey = `amount-${type === 'tokenA' ? 'tokenB' : 'tokenA'}`;
      if (!newAmount) {
        setValue(pairKey, '');
        return;
      }
      const currentInputAmount = new Unit(newAmount);
      const pairTokenExpectedAmount = currentInputAmount?.mul(price);
      setValue(pairKey, trimDecimalZeros(pairTokenExpectedAmount.toDecimalMinUnit(pairToken?.decimals)));
    },
    [type, price, pairToken]
  );

  return (
    <div className="mt-4px h-84px pt-8px pl-16px pr-8px rounded-16px bg-orange-light-hover">
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
    </div>
  );
};

const DepositAmounts: React.FC<Props & { position: PositionForUI; title: string }> = ({ position, title, ...props }) => {
  const { leftToken: tokenA, rightToken: tokenB, fee } = position;
  const i18n = useI18n(transitions);
  // const tokenA = useTokenA();
  // const tokenB = useTokenB();
  // const fee = useCurrentFee();
  const { state, pool } = usePool({ tokenA, tokenB, fee });
  const { isRangeValid, priceInit, setValue, getValues } = props;
  const priceTokenA = useMemo(() => (pool === null ? (priceInit ? new Unit(priceInit) : null) : pool?.priceOf(tokenA!)), [pool, priceInit]);
  const priceTokenB = useMemo(() => (priceTokenA ? new Unit(1).div(priceTokenA) : null), [priceTokenA]);
  const isValidToInput = !!priceTokenA && !!tokenA && !!tokenB && !!isRangeValid;

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

  return (
    <div className={cx('mt-24px', !isValidToInput && 'opacity-50 pointer-events-none')}>
      <p className="mb-8px leading-18px text-14px text-black-normal ml-8px font-medium">{title || i18n.deposit_amounts}</p>
      <DepositAmount {...props} token={tokenA} pairToken={tokenB} type="tokenA" price={priceTokenA} isValidToInput={isValidToInput} />
      <DepositAmount {...props} token={tokenB} pairToken={tokenB} type="tokenB" price={priceTokenB} isValidToInput={isValidToInput} />
    </div>
  );
};

export default memo(DepositAmounts);
