import React from 'react';
import { type UseFormRegister, type UseFormSetValue, type FieldValues } from 'react-hook-form';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Balance from '@modules/Balance';
import Button from '@components/Button';
import Input, { defaultDynamicFontSize } from '@components/Input';
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
    max: 'Max',
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
    <>
      <p className="pl-8px mb-8px text-14px text-black-normal font-normal">{i18n.stake_amount}</p>
      <div className="p-8px pl-16px rounded-16px bg-orange-light-hover mb-16px">
        <div className="flex justify-between items-center">
          <Input
            type="number"
            className="text-24px pr-32px lt-mobile:text-16px"
            clearIcon
            placeholder="0"
            {...register('VST-stake-amount', {
              required: true,
              min: new Unit(1).toDecimalStandardUnit(undefined, TokenVST.decimals),
            })}
            min={new Unit(1).toDecimalStandardUnit(undefined, TokenVST.decimals)}
            step={new Unit(1).toDecimalStandardUnit(undefined, TokenVST.decimals)}
            decimals={TokenVST.decimals}
            dynamicFontSize={defaultDynamicFontSize}
            preventMinus
            id="stake-amount-input"
          />
          <div className="min-w-80px h-40px pl-8px bg-orange-light rounded-full flex items-center">
            <img className="w-24px h-24px mr-4px" src={TokenVST?.logoURI} alt={`${TokenVST?.logoURI} icon`} />
            <span className="text-14px text-black-normal font-normal">{TokenVST?.symbol}</span>
          </div>
        </div>

        <div className="mt-8px ml-auto flex items-center w-fit h-20px text-14px text-gray-normal">
          {i18n.balance}:{' '}
          <Balance className="ml-2px" address={TokenVST.address} decimals={TokenVST.decimals} id="stake-vst-balance">
            {(balance) => (
              <Button
                className="ml-12px px-8px h-20px rounded-4px text-14px font-normal border-1px! hover:bg-orange-normal hover:text-white-normal!"
                variant='outlined'
                color="orange"
                disabled={!balance || balance === '0'}
                onClick={() => setValue('VST-stake-amount', balance)}
                type="button"
                id="stake-amount-max-button"
              >
                {i18n.max}
              </Button>
            )}
          </Balance>
        </div>
      </div>
    </>
  );
};

export default AmountInput;
