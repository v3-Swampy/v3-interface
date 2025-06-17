import React, { useEffect, memo } from 'react';
import { type UseFormRegister, type UseFormSetValue, type FieldValues } from 'react-hook-form';
import cx from 'clsx';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Input from '@components/Input';
import Button from '@components/Button';
import BorderBox from '@components/Box/BorderBox';
import Balance from '@modules/Balance';
import showTokenSelectModal from '@modules/TokenSelectModal';
import useI18n from '@hooks/useI18n';
import { useAccount } from '@service/account';
import { useSourceToken, useDestinationToken, setToken } from '@service/swap';
import { ReactComponent as ArrowDownIcon } from '@assets/icons/arrow_down.svg';

const transitions = {
  en: {
    select_token: 'Select a token',
    balance: 'Balance',
    max: 'Max',
  },
  zh: {
    select_token: '选择代币',
    balance: '余额',
    max: '最大值',
  },
} as const;

interface Props {
  type: 'sourceToken' | 'destinationToken';
  inputedType: 'sourceToken' | 'destinationToken' | null;
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  handleInputChange: (type: 'sourceToken' | 'destinationToken', amount: string) => void;
}

const cfxGas = Unit.fromStandardUnit(0.02);
const SelectedToken: React.FC<Props> = ({ type, inputedType, register, setValue, handleInputChange }) => {
  const i18n = useI18n(transitions);
  const account = useAccount();

  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const currentSelectToken = type === 'sourceToken' ? sourceToken : destinationToken;

  useEffect(() => {
    setValue(`${type}-amount`, '');
    if (inputedType === type) {
      setValue(`${type === 'sourceToken' ? 'destinationToken' : 'sourceToken'}-amount`, '');
    }
  }, [currentSelectToken?.address]);

  return (
    <div className="h-96px lt-mobile:h-74px pt-16px pl-24px pr-16px lt-mobile:pt-8px lt-mobile:pl-16px lt-mobile:pr-8px rounded-20px lt-mobile:rounded-14px bg-orange-light-hover">
      <div className="flex justify-between items-center">
        <Input
          className="text-32px responsive-font-big pr-32px lt-mobile:text-24px"
          clearIcon
          disabled={!currentSelectToken}
          placeholder="0"
          {...register(`${type}-amount`, {
            required: true,
            min: new Unit(1).toDecimalStandardUnit(undefined, currentSelectToken?.decimals),
            onChange: (evt) => handleInputChange(type, evt.target.value),
          })}
          min={new Unit(1).toDecimalStandardUnit(undefined, currentSelectToken?.decimals)}
          step={new Unit(1).toDecimalStandardUnit(undefined, currentSelectToken?.decimals)}
          type="number"
        />

        <BorderBox
          className={cx(
            'flex-shrink-0 ml-14px lt-mobile:ml-4px flex items-center min-w-120px lt-mobile:min-w-102px h-40px lt-mobile:h-32px px-16px lt-mobile:pl-8px lt-mobile:pr-12px rounded-10px lt-mobile:rounded-8px',
            'text-14px text-black-normal font-medium cursor-pointer !transition-none',
            currentSelectToken ? 'bg-orange-light' : 'bg-transparent'
          )}
          variant={!currentSelectToken ? 'gradient-orange-light-hover' : 'transparent'}
          onClick={() => showTokenSelectModal({ currentSelectToken, onSelect: (token) => setToken({ type, token }) })}
        >
          {currentSelectToken && (
            <img className="mr-4px w-24px h-24px lt-mobile:w-20px lt-mobile:h-20px" src={currentSelectToken.logoURI} alt={`${currentSelectToken.symbol} logo`} />
          )}
          {currentSelectToken && currentSelectToken.symbol}
          {!currentSelectToken && i18n.select_token}
          <ArrowDownIcon className="w-8px h-5px ml-24px lt-mobile:ml-16px flex-shrink-0" />
        </BorderBox>
      </div>

      {account && currentSelectToken && (
        <div className="mt-8px lt-mobile:mt-6px ml-auto flex items-center w-fit h-20px text-14px lt-mobile:text-13px text-gray-normal">
          {i18n.balance}:{' '}
          <Balance className="ml-2px" address={currentSelectToken.address} decimals={currentSelectToken.decimals} gas={sourceToken?.address === 'CFX' ? cfxGas : undefined}>
            {(balance) => (
              <Button
                className="ml-12px px-8px h-20px rounded-4px text-14px font-medium border-1px! hover:bg-orange-normal hover:text-white-normal!"
                variant='outlined'
                color="orange"
                disabled={!balance || balance === '0'}
                onClick={() => {
                  if (!balance) return;
                  setValue(`${type}-amount`, balance);
                  handleInputChange(type, balance);
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

export default memo(SelectedToken);
