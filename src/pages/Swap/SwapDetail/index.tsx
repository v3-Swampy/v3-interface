import React, { memo, useState, useCallback, useMemo } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import Tooltip from '@components/Tooltip';
import Accordion from '@components/Accordion';
import Spin from '@components/Spin';
import useI18n from '@hooks/useI18n';
import { useSourceToken, useDestinationToken } from '@service/swap';
import { isTokenEqual } from '@service/tokens';
import { TradeState, TradeType, type useBestTrade } from '@service/pairs&pool';
import { getSlippageTolerance, useSlippageTolerance } from '@service/settings';
import { trimDecimalZeros } from '@utils/numberUtils';
import AutoRouter from './AutoRouter';
import { getAmountOutMinimumDecimal, getAmountInMaximumDecimal } from '@utils/slippage';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';

const transitions = {
  en: {
    expected_output: 'Expected Output',
    expected_output_tooltip:
      'The amount you expect to receive at the current market price. You may receive less or more if the market price changes while your transaction is pending.',
    price_impact: 'Price Impact',
    price_impact_tooltip: 'The impact your trade has on the market price of this pool.',
    minimum_received: 'Minimum received after slippage',
    maximum_send: 'Maximum sent after slippage',
    minimum_received_tooltip: 'The minimum amount you are guaranteed to receive. If the price slips any further,your transaction will revert.',
    maximum_send_tooltip: 'The Maximum_ amount you are guaranteed to send. If the price slips any further, your transaction will revert.',
    network_fee: 'Network Fee',
    network_fee_tooltip: 'The fee paid to miners who process your transaction. This must be paid in CFX.',
  },
  zh: {
    expected_output: '预期获得',
    price_impact: '兑换率影响',
    expected_output_tooltip: '你预期在当前市场价格下收到的金额。如果在你的交易未完成时，市场价格发生变化，你可能会收到更少或更多。',
    price_impact_tooltip: '你的交易对这个池子的市场价格的影响。',
    minimum_received: '滑点后收到的最低数额',
    maximum_send: '滑点后发送的最大数额',
    minimum_received_tooltip: '保证你能收到的最低金额。如果价格进一步下滑，你的交易将被退回。',
    maximum_send_tooltip: '保证你将要发送的最大金额。如果价格进一步下滑，你的交易将被退回。',
    network_fee: '网络费用',
    network_fee_tooltip: '支付给处理你交易的矿工的费用。以 CFX 支付。',
  },
} as const;

interface Props {
  bestTrade: ReturnType<typeof useBestTrade>;
  fromPreview?: boolean;
  largerPriceImpact?: Unit;
  sourceTokenUSDPrice: string | null | undefined;
  destinationTokenUSDPrice: string | null | undefined;
}

const SwapDetail: React.FC<Props> = ({ bestTrade, largerPriceImpact, sourceTokenUSDPrice, destinationTokenUSDPrice, fromPreview }) => {
  const i18n = useI18n(transitions);
  const slippage = getSlippageTolerance() || 0;
  const { value: slippageForUi } = useSlippageTolerance();
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const isBothTokenSelected = sourceToken && destinationToken;

  const [direction, setDirection] = useState<'SourceToDestination' | 'DestinationToSource'>('SourceToDestination');
  const handleClickAccordionTitle = useCallback<React.MouseEventHandler<HTMLParagraphElement>>((evt) => {
    evt.preventDefault();
    setDirection((pre) => (pre === 'SourceToDestination' ? 'DestinationToSource' : 'SourceToDestination'));
  }, []);

  const fromToken = direction === 'SourceToDestination' ? sourceToken : destinationToken;
  const toToken = direction === 'SourceToDestination' ? destinationToken : sourceToken;
  const toTokenPrice = bestTrade?.trade?.[isTokenEqual(fromToken, sourceToken) ? 'priceOut' : 'priceIn'];
  const tradeType = bestTrade?.trade?.tradeType;

  const fromTokenUSDPrice = isTokenEqual(fromToken, sourceToken) ? sourceTokenUSDPrice : destinationTokenUSDPrice;
  // const networkFee = useMemo(
  //   () =>
  //     destinationTokenUSDPrice && sourceTokenUSDPrice && bestTrade.trade
  //       ? bestTrade.trade?.networkFeeByAmount.mul(bestTrade.trade.tradeType === TradeType.EXACT_INPUT ? destinationTokenUSDPrice : sourceTokenUSDPrice)
  //       : undefined,
  //   [destinationTokenUSDPrice, sourceTokenUSDPrice, bestTrade]
  // );
  const networkFee = bestTrade.trade?.networkFeeByAmount
    ? bestTrade.trade?.networkFeeByAmount.toDecimalMinUnit(5) === '0.00000'
      ? '<$0.00001'
      : '$' + bestTrade.trade?.networkFeeByAmount.toDecimalMinUnit(5)
    : undefined;

  const slippageAmount = useMemo(() => {
    let amount = '0';
    let decimals;
    if (tradeType === TradeType.EXACT_INPUT) {
      amount = getAmountOutMinimumDecimal(bestTrade?.trade?.amountOut ?? '0', slippage);
      decimals = destinationToken?.decimals;
    } else {
      amount = getAmountInMaximumDecimal(bestTrade?.trade?.amountIn ?? '0', slippage);
      decimals = sourceToken?.decimals;
    }
    return new Unit(amount).toDecimalStandardUnit(5, decimals);
  }, [tradeType, TradeType, bestTrade, slippage, sourceToken, destinationToken]);

  if (!isBothTokenSelected) return null;
  return (
    <Accordion
      className={cx('rounded-20px border-2px border-solid border-orange-light-hover', fromPreview ? 'mt-8px' : 'mt-6px')}
      titleClassName="pt-16px pb-12px"
      contentClassName="px-24px"
      contentExpandClassName="pb-16px pt-12px"
      expand={fromPreview}
      disabled={bestTrade.state !== TradeState.VALID}
    >
      {(expand) =>
        bestTrade.state !== TradeState.VALID ? (
          <>
            {bestTrade.state === TradeState.INVALID && (
              <p className="ml-24px flex items-center leading-18px text-14px text-gray-normal font-medium">
                Enter the target amount in any input box to get the best price automatically
              </p>
            )}
            {bestTrade.state === TradeState.LOADING && (
              <p className="ml-24px flex items-center leading-18px text-14px text-black-normal font-medium">
                <Spin className="mr-10px" />
                Fetching best price...
              </p>
            )}
            {bestTrade.state === TradeState.ERROR && (
              <p className="ml-24px flex items-center leading-18px text-14px text-error-normal font-medium cursor-pointer underline">
                {bestTrade.error ?? 'Fetching best price Failed, please wait a moment and try again.'}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="ml-24px relative leading-18px text-14px text-black-normal font-medium cursor-ew-resize" onClick={handleClickAccordionTitle}>
              {`1 ${fromToken?.symbol}`}&nbsp;&nbsp;=&nbsp;&nbsp;{`${toTokenPrice?.toDecimalMinUnit(5)} ${toToken?.symbol}`}
              {fromTokenUSDPrice && <>&nbsp;&nbsp;({trimDecimalZeros(Number(fromTokenUSDPrice).toFixed(5))}$)</>}
              <Tooltip>
                <span className={cx(
                  'ml-6px mb-2px transition-opacity duration-125',
                  expand && 'opacity-0 pointer-events-none'
                )}>
                  <InfoIcon className="w-12px h-12px" />
                </span>
              </Tooltip>
            </p>
            {networkFee && (
              <span
                className={cx(
                  'absolute top-1/2 right-38px -translate-y-[calc(50%-2.5px)] inline-flex items-center text-14px text-gray-normal transition-opacity duration-125',
                  expand && 'opacity-0 pointer-events-none'
                )}
              >
                <span className="i-ic:outline-local-gas-station text-16px mr-2px" />{networkFee}
              </span>
            )}

            {!fromPreview && <span className="accordion-arrow i-ic:sharp-keyboard-arrow-down absolute right-16px top-1/2 -translate-y-[calc(50%-2.5px)] text-16px font-medium" />}
          </>
        )
      }

      <p className="flex justify-between items-center leading-18px text-14px font-medium">
        <Tooltip text={i18n.expected_output_tooltip}>
          <span className="flex items-center text-gray-normal">
            {i18n.expected_output}
            <InfoIcon className="w-12px h-12px ml-6px" />
          </span>
        </Tooltip>
        <span className="text-black-normal">
          {bestTrade.trade?.amountOut?.toDecimalStandardUnit(5, destinationToken?.decimals)} {destinationToken?.symbol}
        </span>
      </p>

      <p className="mt-8px flex justify-between items-center leading-18px text-14px font-medium">
        <Tooltip text={i18n.price_impact_tooltip}>
          <span className="flex items-center text-gray-normal">
            {i18n.price_impact}
            <InfoIcon className="w-12px h-12px ml-6px" />
          </span>
        </Tooltip>
        <span className="text-gray-normal">{largerPriceImpact?.mul(100).toDecimalMinUnit(2)}%</span>
      </p>

      {tradeType !== undefined && (
        <p className="mt-8px flex justify-between items-center leading-18px text-14px text-gray-normal font-medium">
          <div className="w-full">
            <Tooltip text={tradeType === TradeType.EXACT_INPUT ? i18n.minimum_received_tooltip : i18n.maximum_send_tooltip}>
              <div className="flex justify-between items-center">
                <span className="flex items-center">
                  {tradeType === TradeType.EXACT_INPUT ? i18n.minimum_received : i18n.maximum_send} ({slippageForUi} %)
                  <InfoIcon className="w-12px h-12px ml-6px" />
                </span>
                <span>
                  {slippageAmount} {tradeType === TradeType.EXACT_INPUT ? destinationToken?.symbol : sourceToken?.symbol}
                </span>
              </div>
            </Tooltip>
          </div>
        </p>
      )}

      <p className="mt-8px flex justify-between items-center leading-18px text-14px text-gray-normal font-medium">
        <Tooltip text={i18n.network_fee_tooltip}>
          <span className="flex items-center">
            {i18n.network_fee}
            <InfoIcon className="w-12px h-12px ml-6px" />
          </span>
        </Tooltip>
        <span>{networkFee}</span>
      </p>

      {!fromPreview && (
        <>
          <div className="my-16px h-2px bg-#FFF5E7" />
          <AutoRouter bestTrade={bestTrade} networkFee={networkFee} />
        </>
      )}
    </Accordion>
  );
};

export default memo(SwapDetail);
