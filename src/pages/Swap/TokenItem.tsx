import React, { useEffect, memo } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/conflux/Fluent';
import { type UseFormRegister, type UseFormSetValue, type FieldValues } from 'react-hook-form';
import useI18n from '@hooks/useI18n';
import { useSourceToken, useDestinationToken } from '@service/swap';
import showTokenSelectModal from './TokenSelect';

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

const TokenItem: React.FC<Props> = ({ type, register, setValue }) => {
  const i18n = useI18n(transitions);
  const useToken = type === 'sourceToken' ? useSourceToken : useDestinationToken;
  const token = useToken();
  useEffect(() => {
    setValue(`${type}-amount`, '');
  }, [token]);

  return (
    <div className="p-16px rounded-12px bg-#f5f6fc">
      <div className="flex justify-between items-center">
        <input
          disabled={!token}
          placeholder="0"
          {...register(`${type}-amount`, {
            required: true,
            min: Unit.fromMinUnit(1).toDecimalStandardUnit(),
          })}
        />

        <button onClick={showTokenSelectModal}>
          {token && token.symbol}
          {!token && i18n.select_token}
        </button>
      </div>

      <div className="mt-12px flex justify-end items-center">
        <span className="text-12px text-#0d111c">{i18n.balance}:</span>
        <button className="ml-12px">{i18n.max}</button>
      </div>
    </div>
  );
};

export default memo(TokenItem);
