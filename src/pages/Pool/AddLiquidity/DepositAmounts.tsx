import React, { useEffect, memo } from 'react';
import { type UseFormRegister, type UseFormSetValue, type FieldValues } from 'react-hook-form';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import Input from '@components/Input';
import Button from '@components/Button';
import Balance from '@modules/Balance';
import { type Token } from '@service/tokens';
import { useAccount } from '@service/account';
import useI18n from '@hooks/useI18n';
import { useTokenA, useTokenB } from './SelectPair';

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
}

const DepositAmount: React.FC<Props & { token: Token | null; type: 'tokenA' | 'tokenB' }> = ({ type, token, register, setValue }) => {
  const i18n = useI18n(transitions);
  const account = useAccount();

  useEffect(() => {
    setValue(`amount-${type}`, '');
  }, [token, account]);

  return (
    <div className="mt-4px h-84px pt-8px pl-16px pr-8px rounded-16px bg-orange-light-hover">
      <div className="flex justify-between items-center">
        <Input
          className="text-24px"
          clearIcon
          disabled={!token}
          placeholder="0"
          id={`input--${type}-amount`}
          type='number'
          {...register(`amount-${type}`, {
            required: true,
            min: Unit.fromMinUnit(1).toDecimalStandardUnit(undefined, token?.decimals),
          })}
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
                onClick={() => setValue(`amount-${type}`, balance)}
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

const DepositAmounts: React.FC<Props> = ({ ...props }) => {
  const i18n = useI18n(transitions);
  const tokenA = useTokenA();
  const tokenB = useTokenB();
  const isBothTokenSelected = !!tokenA && !!tokenB;

  return (
    <div className={cx('mt-24px', !isBothTokenSelected && 'opacity-50 pointer-events-none')}>
      <p className="mb-8px leading-18px text-14px text-black-normal font-medium">{i18n.deposit_amounts}</p>

      <DepositAmount {...props} token={tokenA} type="tokenA" />
      <DepositAmount {...props} token={tokenB} type="tokenB" />
    </div>
  );
};

export default memo(DepositAmounts);
