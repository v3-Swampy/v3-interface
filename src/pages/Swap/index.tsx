import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { debounce } from 'lodash-es';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Settings from '@modules/Settings';
import useI18n from '@hooks/useI18n';
import {
  exchangeTokenDirection,
  handleConfirmSwap,
  useSourceToken,
  useDestinationToken,
  getSourceToken,
  getDestinationToken,
  confirmPriceImpactWithoutFee,
  warningSeverity,
} from '@service/swap';
import { useBestTrade, TradeState, useTokenPrice } from '@service/pairs&pool';
import { TradeType } from '@service/pairs&pool/bestTrade';
import { useExpertMode } from '@service/settings';
import { computeFiatValuePriceImpact } from '@service/swap';
import { ReactComponent as ExchangeIcon } from '@assets/icons/exchange.svg';
import SelectedToken from './SelectedToken';
import SubmitButton from './SubmitButton';
import SwapDetail from './SwapDetail';
import PriceImpactWarning from './PriceImpactWarning';

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
  const { register, handleSubmit: withForm, setValue, watch, getValues } = useForm();
  const sourceTokenAmount = watch('sourceToken-amount') as string;
  const destinationTokenAmount = watch('destinationToken-amount') as string;
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const sourceTokenUSDPrice = useTokenPrice(sourceToken?.address);
  const destinationTokenUSDPrice = useTokenPrice(destinationToken?.address);

  const [inputedType, setInputedType] = useState<'sourceToken' | 'destinationToken' | null>(null);
  const inputedAmount = inputedType === null ? '' : inputedType === 'sourceToken' ? sourceTokenAmount : destinationTokenAmount;
  const currentTradeType = inputedType === null || !inputedAmount ? null : inputedType === 'sourceToken' ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT;
  const bestTrade = useBestTrade(currentTradeType, inputedAmount, sourceToken, destinationToken);

  const sourceTokenTradeAmountUSDPrice = useTokenPrice(sourceToken?.address, sourceTokenAmount);
  const destinationTokenTradeAmountUSDPrice = useTokenPrice(destinationToken?.address, destinationTokenAmount);

  const stablecoinPriceImpact = useMemo(
    () => (!bestTrade?.trade ? undefined : computeFiatValuePriceImpact(sourceTokenTradeAmountUSDPrice, destinationTokenTradeAmountUSDPrice)),
    [sourceTokenTradeAmountUSDPrice, destinationTokenTradeAmountUSDPrice, bestTrade]
  );

  const { priceImpactSeverity, largerPriceImpact } = useMemo(() => {
    const marketPriceImpact = bestTrade?.trade?.priceImpact;
    const largerPriceImpact = stablecoinPriceImpact && marketPriceImpact ? Unit.max(stablecoinPriceImpact, marketPriceImpact) : marketPriceImpact || stablecoinPriceImpact;
    return {
      priceImpactSeverity: warningSeverity(largerPriceImpact),
      largerPriceImpact,
    };
  }, [bestTrade, stablecoinPriceImpact]);

  const [expertMode] = useExpertMode();

  const priceImpactTooHigh = largerPriceImpact ? priceImpactSeverity > 3 && !expertMode : undefined;
  const showPriceImpactWarning = largerPriceImpact?.toDecimalMinUnit() && priceImpactSeverity > 3;

  useEffect(() => {
    if (inputedType && bestTrade.state === TradeState.VALID && bestTrade?.trade) {
      const sourceToken = getSourceToken();
      const destinationToken = getDestinationToken();
      setValue(
        `${inputedType === 'sourceToken' ? 'destinationToken' : 'sourceToken'}-amount`,
        inputedAmount
          ? bestTrade.trade[inputedType === 'sourceToken' ? 'amountOut' : 'amountIn']?.toDecimalStandardUnit(
              undefined,
              (inputedType === 'sourceToken' ? destinationToken : sourceToken)?.decimals
            )
          : ''
      );
    }
  }, [bestTrade]);

  const handleInputTypeChange = useCallback(
    debounce((type: 'sourceToken' | 'destinationToken', amount: string) => {
      if (!amount) {
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
    handleInputTypeChange(type, amount);
  }, []);

  const onSubmit = useCallback(
    withForm(async (data) => {
      if (stablecoinPriceImpact && !confirmPriceImpactWithoutFee(stablecoinPriceImpact)) {
        return;
      }
      handleConfirmSwap({
        sourceTokenAmount: data['sourceToken-amount'],
        destinationTokenAmount: data['destinationToken-amount'],
        bestTrade,
        sourceTokenUSDPrice,
        destinationTokenUSDPrice,
      });
    }),
    [bestTrade, sourceTokenUSDPrice, destinationTokenUSDPrice, stablecoinPriceImpact]
  );

  return (
    <PageWrapper className="pt-56px">
      <BorderBox className="relative mx-auto max-w-572px p-16px rounded-28px" variant="gradient-white">
        <div className="mb-16px flex justify-between items-center pr-8px">
          <span className="w-84px h-40px leading-40px rounded-100px text-center text-14px text-black-normal font-medium bg-orange-light-hover">{i18n.swap}</span>
          <Settings />
        </div>

        <form onSubmit={onSubmit}>
          <SelectedToken type="sourceToken" register={register} setValue={setValue} inputedType={inputedType} handleInputChange={handleInputChange} />
          <div
            className="mx-auto -my-21.5px w-fit h-fit p-4px bg-white-normal rounded-full translate-y-0 cursor-pointer"
            onClick={() => {
              exchangeTokenDirection();
              setValue('sourceToken-amount', '');
              setValue('destinationToken-amount', '');
            }}
          >
            <div className="w-40px h-40px flex justify-center items-center rounded-full bg-orange-light">
              <ExchangeIcon className="w-26px h-26px" />
            </div>
          </div>
          <SelectedToken type="destinationToken" register={register} setValue={setValue} inputedType={inputedType} handleInputChange={handleInputChange} />

          <SwapDetail bestTrade={bestTrade} sourceTokenUSDPrice={sourceTokenUSDPrice} destinationTokenUSDPrice={destinationTokenUSDPrice} largerPriceImpact={largerPriceImpact} />

          {showPriceImpactWarning && <PriceImpactWarning largerPriceImpact={largerPriceImpact} />}

          <SubmitButton
            sourceTokenAmount={sourceTokenAmount}
            destinationTokenAmount={destinationTokenAmount}
            priceImpactTooHigh={priceImpactTooHigh}
            priceImpactSeverity={priceImpactSeverity}
            tradeState={bestTrade.state}
          />
        </form>
      </BorderBox>
    </PageWrapper>
  );
};

export default SwapPage;
