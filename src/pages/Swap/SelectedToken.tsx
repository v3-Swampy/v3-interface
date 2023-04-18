import React, { useCallback, useEffect, memo } from 'react';
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
import { useSourceToken, useDestinationToken, setToken, TradeType } from '@service/swap';
import { useClientBestTrade, TradeState } from '@service/pairs&pool';
import { trimDecimalZeros } from '@utils/numberUtils';

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
  sourceTokenAmount: string;
  destinationTokenAmount: string;
}

const SelectedToken: React.FC<Props> = ({ type, register, setValue, sourceTokenAmount, destinationTokenAmount }) => {
  const i18n = useI18n(transitions);
  const account = useAccount();

  const pairKey = `${type === 'sourceToken' ? 'destinationToken' : 'sourceToken'}-amount`;
  const useCurrentSelectToken = type === 'sourceToken' ? useSourceToken : useDestinationToken;
  const currentSelectToken = useCurrentSelectToken();
  const usePairToken = type === 'sourceToken' ? useDestinationToken : useSourceToken;
  const pairToken = usePairToken();
  const sourceToken = useSourceToken()
  const destinationToken =  useDestinationToken()
  console.log('aaa', pairKey, type)


  useEffect(() => {
    setValue(`${type}-amount`, '');
  }, [currentSelectToken]);

  const isTokenIn = type === 'sourceToken';
  const amount = isTokenIn ? sourceTokenAmount : destinationTokenAmount;
  console.log('test', amount)
  const result = useClientBestTrade(isTokenIn ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT, amount, sourceToken, destinationToken)

  const changePairAmount = useCallback<React.FocusEventHandler<HTMLInputElement>>(
    (evt) => {
      const amount = evt.target.value;
      if(!amount) return;
      console.log('amountInput', amount)
      console.log('result', result)
      let price = '0';
      if (result.state === TradeState.VALID && result.trade) {
        console.log('trade', result.trade)
        price = new Unit(isTokenIn ? result.trade.amountOut : result.trade.amountIn).toDecimalStandardUnit(undefined, isTokenIn ? destinationToken?.decimals : sourceToken?.decimals);
      }
      const currentInputAmount = new Unit(amount);
      const pairTokenExpectedAmount = currentInputAmount?.mul(price);
      setValue(pairKey, trimDecimalZeros(pairTokenExpectedAmount.toDecimalMinUnit(5)));
    },
    [type, pairToken, result] // TODO: add price here
  );

  // useEffect(() => {
  //   const currentInputAmount = new Unit(newAmount);
  //   const pairTokenExpectedAmount = currentInputAmount?.mul(price);
  //   setValue(pairKey, trimDecimalZeros(pairTokenExpectedAmount.toDecimalMinUnit(pairToken?.decimals)));
  // }, [pairToken]);

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
            min: new Unit(1).toDecimalStandardUnit(undefined, currentSelectToken?.decimals),
          })}
          min={new Unit(1).toDecimalStandardUnit(undefined, currentSelectToken?.decimals)}
          step={new Unit(1).toDecimalStandardUnit(undefined, currentSelectToken?.decimals)}
          onBlur={changePairAmount}
        />

        <BorderBox
          className={cx(
            'flex-shrink-0 ml-14px flex items-center min-w-120px h-40px px-16px rounded-10px text-14px text-black-normal font-medium cursor-pointer !transition-none',
            currentSelectToken ? 'bg-orange-light' : 'bg-transparent'
          )}
          variant={!currentSelectToken ? 'gradient-orange-light-hover' : 'transparent'}
          onClick={() => showTokenSelectModal({ currentSelectToken, onSelect: (token) => setToken({ type, token }) })}
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
              <Button
                className="ml-12px px-8px h-20px rounded-4px text-14px font-medium"
                color="orange"
                disabled={!balance || balance === '0'}
                onClick={() => setValue(`${type}-amount`, balance)}
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
