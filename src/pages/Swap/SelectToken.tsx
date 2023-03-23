import React, { useEffect, memo } from 'react';
import { type UseFormRegister, type UseFormSetValue, type FieldValues } from 'react-hook-form';
import cx from 'clsx';
import { Unit } from '@cfxjs/use-wallet-react/conflux/Fluent';
import Input from '@components/Input';
import BorderBox from '@components/Box/BorderBox';
import Balance from '@modules/Balance';
import useI18n from '@hooks/useI18n';
import { useAccount } from '@service/account';
import { useSourceToken, useDestinationToken } from '@service/swap';
import showTokenListModal from './TokenListModal';

const transitions = {
  en: {
    select_token: 'Select Token',
    balance: 'Balance',
    max: 'MAX',
  },
  zh: {
    select_token: '选择代币',
    balance: '余额',
    max: '最大值',
  },
} as const;

interface Props {
  type: 'sourceToken' | 'destinationToken';
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
}

const SelectToken: React.FC<Props> = ({ type, register, setValue }) => {
  const i18n = useI18n(transitions);
  const account = useAccount();

  const useCurrentSelectToken = type === 'sourceToken' ? useSourceToken : useDestinationToken;
  const currentSelectToken = useCurrentSelectToken();
  useEffect(() => {
    setValue(`${type}-amount`, '');
  }, [currentSelectToken]);

  return (
    <div className="h-96px pt-16px pl-24px pr-16px rounded-20px bg-orange-light-hover">
      <div className="flex justify-between items-center">
        <Input
          className="text-32px"
          clearIcon
          disabled={!currentSelectToken}
          placeholder="0"
          {...register(`${type}-amount`, {
            required: true,
            min: Unit.fromMinUnit(1).toDecimalStandardUnit(),
          })}
        />

        <BorderBox
          className={cx(
            'flex-shrink-0 ml-14px flex items-center min-w-120px h-40px px-16px rounded-10px text-14px text-black-normal font-medium cursor-pointer !transition-none',
            currentSelectToken ? 'bg-orange-light' : 'bg-transparent'
          )}
          variant={!currentSelectToken ? 'gradient-orange-light-hover' : 'transparent'}
          onClick={() => showTokenListModal(type)}
        >
          {currentSelectToken && <img className="w-24px h-24px mr-4px" src={currentSelectToken.logoURI} alt={`${currentSelectToken.symbol} logo`} />}
          {currentSelectToken && currentSelectToken.symbol}
          {!currentSelectToken && i18n.select_token}
          <span className="i-ic:sharp-keyboard-arrow-down ml-24px flex-shrink-0 text-16px font-medium" />
        </BorderBox>
      </div>

      {account && currentSelectToken && (
        <div className="mt-8px ml-auto flex items-center w-fit h-20px text-14px text-gray-normal">
          {i18n.balance}:{' '}
          <Balance className="ml-2px" address={currentSelectToken.address} decimals={currentSelectToken.decimals}>
            {(balance) => (
              <button className="ml-12px text-12px" disabled={!balance || balance === '0'} onClick={() => setValue(`${type}-amount`, balance)}>
                {i18n.max}
              </button>
            )}
          </Balance>
        </div>
      )}
    </div>
  );
};

export default memo(SelectToken);