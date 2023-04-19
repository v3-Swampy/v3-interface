import React, { useCallback, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { debounce } from 'lodash-es';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Settings from '@modules/Settings';
import useI18n from '@hooks/useI18n';
import { exchangeTokenDirection, handleSwap, useCalcDetailAndRouter, useSourceToken, useDestinationToken, getSourceToken, getDestinationToken } from '@service/swap';
import { useClientBestTrade, TradeState } from '@service/pairs&pool';
import { TradeType } from '@service/swap';
import { ReactComponent as ExchangeIcon } from '@assets/icons/exchange.svg';
import SelectedToken from './SelectedToken';
import SubmitButton from './SubmitButton';
import SwapDetail from './SwapDetail';

const transitions = {
  en: {
    swap: 'Swap',
  },
  zh: {
    swap: '兑换',
  },
} as const;

const SwapPage: React.FC = () => {
  const i18n = useI18n(transitions);
  const { register, handleSubmit: withForm, setValue, watch } = useForm();
  const sourceTokenAmount = watch('sourceToken-amount');
  const destinationTokenAmount = watch('destinationToken-amount');
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();

  const [inputedType, setInputedType] = useState<'sourceToken' | 'destinationToken' | null>(null);
  const inputedAmount = inputedType === null ? '' : inputedType === 'sourceToken' ? sourceTokenAmount : destinationTokenAmount;
  const currentTradeType = inputedType === null || !inputedAmount ? null : inputedType === 'sourceToken' ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT;
  const bestTrade = useClientBestTrade(currentTradeType, inputedAmount, sourceToken, destinationToken);
  useEffect(() => {
    if (inputedType && bestTrade.state === TradeState.VALID && bestTrade.trade) {
      setValue(`${inputedType === 'sourceToken' ? 'destinationToken' : 'sourceToken'}-amount`, inputedAmount ?
        (bestTrade.trade.tradeType === TradeType.EXACT_INPUT ?
          bestTrade.trade.amountOut?.toDecimalStandardUnit() : bestTrade.trade.amountIn?.toDecimalStandardUnit())
        : '');
    }
  }, [bestTrade]);

  const handleInputeTypeChange = useCallback(
    debounce((type: 'sourceToken' | 'destinationToken', amount: string) => {
      const sourceToken = getSourceToken();
      const destinationToken = getDestinationToken();
      if (!sourceToken || !destinationToken || !amount) {
        setInputedType(null);
        return;
      }
      setInputedType(type);
    }, 333),
    []
  );
  const handleInputChange = useCallback((type: 'sourceToken' | 'destinationToken', amount: string) => {
    setInputedType(null);
    setValue(`${type === 'sourceToken' ? 'destinationToken' : 'sourceToken'}-amount`, '');
    handleInputeTypeChange(type, amount);
  }, []);

  const onSubmit = useCallback(
    withForm(async (data) => {
      handleSwap({
        sourceTokenAmount: data['sourceToken-amount'],
        destinationTokenAmount: data['destinationToken-amount'],
        bestTrade,
      });
    }),
    [bestTrade]
  );

  useCalcDetailAndRouter();

  return (
    <PageWrapper className="pt-56px">
      <BorderBox className="relative mx-auto max-w-572px p-16px rounded-28px" variant="gradient-white">
        <div className="mb-16px flex justify-between items-center pr-8px">
          <span className="w-84px h-40px leading-40px rounded-100px text-center text-14px text-black-normal font-medium bg-orange-light-hover">{i18n.swap}</span>
          <Settings />
        </div>

        <form onSubmit={onSubmit}>
          <SelectedToken type="sourceToken" register={register} setValue={setValue} handleInputChange={handleInputChange} />
          <div className="mx-auto -my-21.5px w-fit h-fit p-4px bg-white-normal rounded-full translate-y-0 cursor-pointer" onClick={() => {
            exchangeTokenDirection();
            setValue('sourceToken-amount', '');
            setValue('destinationToken-amount', '');
          }}>
            <div className="w-40px h-40px flex justify-center items-center rounded-full bg-orange-light">
              <ExchangeIcon className="w-26px h-26px" />
            </div>
          </div>
          <SelectedToken type="destinationToken" register={register} setValue={setValue} handleInputChange={handleInputChange} />

          <SwapDetail bestTrade={bestTrade} />

          <SubmitButton sourceTokenAmount={sourceTokenAmount} />
        </form>
      </BorderBox>
    </PageWrapper>
  );
};

export default SwapPage;
