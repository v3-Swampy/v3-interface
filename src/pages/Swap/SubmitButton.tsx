import React, { memo, useMemo } from 'react';
import cx from 'clsx';
import { useSourceToken, useDestinationToken, WarningSeverity } from '@service/swap';
import { TradeState } from '@service/pairs&pool';
import Button from '@components/Button';
import AuthConnectButton from '@modules/AuthConnectButton';
import AuthTokenButton from '@modules/AuthTokenButton';
import { UniswapV3SwapRouter } from '@contracts/index';
import useI18n from '@hooks/useI18n';

const transitions = {
  en: {
    please_select_token: 'Select a token',
    swap: 'Swap',
    enter_an_amount: 'Enter an amount',
    no_liquidity: 'Insufficient liquidity for this trade',
    price_impact_too_high: 'Price Impact Too High',
    swap_anyway: 'Swap Anyway',
  },
  zh: {
    please_select_token: '请选择代币',
    swap: '交换',
    enter_an_amount: 'Enter an amount',
    no_liquidity: 'Insufficient liquidity for this trade',
    price_impact_too_high: 'Price Impact Too High',
    swap_anyway: 'Swap Anyway',
  },
} as const;

interface Props {
  sourceTokenAmount: string;
  destinationTokenAmount: string;
  priceImpactTooHigh: boolean;
  priceImpactSeverity: WarningSeverity;
  tradeState: TradeState;
}

const SubmitButton: React.FC<Props> = ({ sourceTokenAmount, destinationTokenAmount, priceImpactTooHigh, priceImpactSeverity, tradeState }) => {
  const i18n = useI18n(transitions);
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const isBothTokenSelected = sourceToken && destinationToken;

  const buttonText = useMemo(() => {
    if (!isBothTokenSelected) return i18n.please_select_token;
    if (!sourceTokenAmount && !destinationTokenAmount) return i18n.enter_an_amount;
    if(tradeState === TradeState.NO_ROUTE_FOUND) return i18n.no_liquidity;
    if (priceImpactTooHigh) return i18n.price_impact_too_high;
    if (priceImpactSeverity > 2) return i18n.swap_anyway;
    return i18n.swap;
  }, [isBothTokenSelected, priceImpactTooHigh, priceImpactSeverity, sourceTokenAmount, destinationTokenAmount, tradeState])

  return (
    <AuthConnectButton {...buttonProps}>
      <AuthTokenButton {...buttonProps} tokenAddress={sourceToken?.address} contractAddress={UniswapV3SwapRouter.address} amount={sourceTokenAmount}>
        <Button {...buttonProps} className={cx(buttonProps.className, !isBothTokenSelected && 'pointer-events-none')} disabled={!isBothTokenSelected || priceImpactTooHigh || tradeState !== TradeState.VALID || (!sourceTokenAmount && !destinationTokenAmount)}>
          {buttonText}
        </Button>
      </AuthTokenButton>
    </AuthConnectButton>
  );
};

const buttonProps = {
  className: 'mt-24px h-40px text-18px rounded-100px',
  color: 'gradient',
  fullWidth: true,
} as const;

export default memo(SubmitButton);
