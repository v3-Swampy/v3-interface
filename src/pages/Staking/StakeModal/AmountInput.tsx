import React from 'react';
import { type UseFormRegister, type UseFormSetValue, type FieldValues } from 'react-hook-form';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Balance from '@modules/Balance';
import Button from '@components/Button';
import Input from '@components/Input';
import useI18n from '@hooks/useI18n';
import { type Token } from '@service/tokens';

interface Props {
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  TokenVST: Token;
}

const transitions = {
  en: {
    stake_amount: 'Stake Amount',
    balance: 'Balance',
    max: 'MAX',
  },
  zh: {
    stake_amount: '质押数量',
    balance: '余额',
    max: '最大值',
  },
} as const;

const AmountInput: React.FC<Props> = ({ register, setValue, TokenVST }) => {
  const i18n = useI18n(transitions);

  return (
    <div className="py-16px pl-24px pr-16px rounded-20px bg-orange-light-hover">
      <p className="mb-8px text-14px text-black-normal font-medium">{i18n.stake_amount}</p>
      <div className="flex justify-between items-center">
        <Input
          className="text-32px"
          clearIcon
          placeholder="0"
          {...register('VST-stake-amount', {
            required: true,
            min: Unit.fromMinUnit(1).toDecimalStandardUnit(undefined, TokenVST.decimals),
          })}
        />

        <span className="text-14px text-black-normal font-medium">PPI</span>
      </div>

      <div className="mt-8px ml-auto flex items-center w-fit h-20px text-14px text-gray-normal">
        {i18n.balance}:{' '}
        <Balance className="ml-2px" address={TokenVST.address} decimals={TokenVST.decimals}>
          {(balance) => (
            <Button
              className="ml-12px px-8px h-20px rounded-4px text-14px font-medium"
              color="orange"
              disabled={!balance || balance === '0'}
              onClick={() => setValue('VST-stake-amount', balance)}
              type="button"
            >
              {i18n.max}
            </Button>
          )}
        </Balance>
      </div>
    </div>
  );
};


export default AmountInput;
