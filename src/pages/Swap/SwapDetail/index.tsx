import React, { memo, useState, useCallback } from 'react';
import cx from 'clsx';
import ToolTip from '@components/Tooltip';
import Accordion from '@components/Accordion';
import useI18n from '@hooks/useI18n';
import { useSourceToken, useDestinationToken } from '@service/swap';
import AutoRouter from './AutoRouter';

const transitions = {
  en: {
    expected_output: 'Expected Output',
    expected_output_tooltip:
      'The amount you expect to receive at the current market price. You may receive less or more if the market price changes while your transaction is pending.',
    price_impact: 'Price Impact',
    price_impact_tooltip: 'The impact your trade has on the market price of this pool.',
    minimum_received: 'Minimum received after slippage',
    minimum_received_tooltip: 'The minimum amount you are guaranteed to receive. If the price slips any further,your transaction will revert.',
    network_fee: 'Network Fee',
    network_fee_tooltip: 'The fee paid to miners who process your transaction. This must be paid in ETH.',
  },
  zh: {
    expected_output: '预期获得',
    price_impact: '兑换率影响',
    expected_output_tooltip: '你预期在当前市场价格下收到的金额。如果在你的交易未完成时，市场价格发生变化，你可能会收到更少或更多。',
    price_impact_tooltip: '你的交易对这个池子的市场价格的影响。',
    minimum_received: '滑点后收到的最低数额',
    minimum_received_tooltip: '保证你能收到的最低金额。如果价格进一步下滑，你的交易将被退回。',
    network_fee: '网络费用',
    network_fee_tooltip: '支付给处理你交易的矿工的费用。以 CFX 支付。',
  },
} as const;

const SwapDetail: React.FC = () => {
  const i18n = useI18n(transitions);
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const isBothTokenSelected = sourceToken && destinationToken

  const [diretion, setDirection] = useState<'SourceToDestination' | 'DestinationToSource'>('SourceToDestination');
  const handleClickAccordionTitle = useCallback<React.MouseEventHandler<HTMLParagraphElement>>((evt) => {
    evt.preventDefault();
    setDirection((pre) => (pre === 'SourceToDestination' ? 'DestinationToSource' : 'SourceToDestination'));
  }, []);

  const fromToken = diretion === 'SourceToDestination' ? sourceToken : destinationToken;
  const toToken = diretion === 'SourceToDestination' ? destinationToken : sourceToken;

  if (!isBothTokenSelected) return null;
  return (
    <Accordion
      className="mt-6px rounded-20px border-2px border-solid border-orange-light-hover"
      titleClassName="pt-16px pb-12px"
      contentClassName="px-24px"
      contentExpandClassName="pb-16px pt-12px"
    >
      {(expand) => (
        <>
          <p className="ml-24px relative leading-18px text-14px text-black-normal font-medium cursor-ew-resize" onClick={handleClickAccordionTitle}>
            {`1 ${fromToken?.symbol}`}&nbsp;&nbsp;=&nbsp;&nbsp;{`233 ${toToken?.symbol}`}
            <ToolTip>
              <span
                className={cx(
                  'i-fa6-solid:circle-info ml-6px mb-2px text-13px text-gray-normal font-medium transition-opacity duration-125',
                  expand && 'opacity-0 pointer-events-none'
                )}
              />
            </ToolTip>
          </p>
          <span
            className={cx(
              'absolute top-1/2 right-38px -translate-y-[calc(50%-2.5px)] inline-flex items-center text-14px text-gray-normal transition-opacity duration-125',
              expand && 'opacity-0 pointer-events-none'
            )}
          >
            <span className="i-ic:outline-local-gas-station text-16px mr-2px" />
            $11.80
          </span>
          <span className="accordion-arrow i-ic:sharp-keyboard-arrow-down absolute right-16px top-1/2 -translate-y-[calc(50%-2.5px)] text-16px font-medium" />
        </>
      )}

      <p className="flex justify-between items-center leading-18px text-14px font-medium">
        <ToolTip text={i18n.expected_output_tooltip}>
          <span className="text-gray-normal">
            {i18n.expected_output}
            <span className="i-fa6-solid:circle-info ml-6px mb-2.5px text-13px text-gray-normal font-medium" />
          </span>
        </ToolTip>
        <span className="text-black-normal">233 {sourceToken?.symbol}</span>
      </p>

      <p className="mt-8px flex justify-between items-center leading-18px text-14px font-medium">
        <ToolTip text={i18n.price_impact_tooltip}>
          <span className="text-gray-normal">
            {i18n.price_impact}
            <span className="i-fa6-solid:circle-info ml-6px mb-2.5px text-13px text-gray-normal font-medium" />
          </span>
        </ToolTip>
        <span className="text-black-normal">0.00%</span>
      </p>

      <p className="mt-8px flex justify-between items-center leading-18px text-14px text-gray-normal font-medium">
        <ToolTip text={i18n.minimum_received_tooltip}>
          <span>
            {i18n.minimum_received} (5.00%)
            <span className="i-fa6-solid:circle-info ml-6px mb-2.5px text-13px text-gray-normal font-medium" />
          </span>
        </ToolTip>
        <span>233 {sourceToken?.symbol}</span>
      </p>

      <p className="mt-8px flex justify-between items-center leading-18px text-14px text-gray-normal font-medium">
        <ToolTip text={i18n.network_fee_tooltip}>
          <span>
            {i18n.network_fee}
            <span className="i-fa6-solid:circle-info ml-6px mb-2.5px text-13px text-gray-normal font-medium" />
          </span>
        </ToolTip>
        <span>~$4.84</span>
      </p>

      <div className="my-16px h-2px bg-#FFF5E7" />

      <AutoRouter />
    </Accordion>
  );
};

export default memo(SwapDetail);
