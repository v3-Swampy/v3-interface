import React, { memo } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Accordion from '@components/Accordion';
import useI18n, { compiled } from '@hooks/useI18n';
import { useSourceToken, useDestinationToken } from '@service/swap';
import { type useBestTrade, TradeType, Trade, Route, Protocol } from '@service/pairs&pool';
import { Token, getUnwrapperTokenByAddress } from '@service/tokens';
import { ReactComponent as ArrowDownIcon } from '@assets/icons/arrow_down.svg';
import RoutingDiagram from './RoutingDiagram';

const transitions = {
  en: {
    auto_router: 'Auto Router',
    auto_router_tip:
      'Best price route costs ~{dollar_price} in gas. This route optimizes your total output by considering split routes, multiple hops, and the gas cost of each step.',
  },
  zh: {
    auto_router: '自动路由',
    auto_router_tip: '最佳价格路由消耗的gas约为 {dollar_price} 此路线通过考虑拆分路线、多跳和每一步的 gas 成本来优化您的总输出额。',
  },
} as const;

interface Props {
  bestTrade: ReturnType<typeof useBestTrade>;
  networkFee?: string;
}

const AutoRouter: React.FC<Props> = ({ bestTrade, networkFee }) => {
  const i18n = useI18n(transitions);
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const routes = getTokenPath(bestTrade?.trade);

  return (
    <Accordion
      className="mt-6px rounded-20px border-2px border-solid border-orange-light-hover"
      titleClassName="pt-16px pb-12px"
      contentClassName="px-24px lt-mobile:px-16px"
      contentExpandClassName="pb-16px pt-12px"
    >
      {() => (
        <>
          <p className="text-gradient-orange ml-24px lt-mobile:ml-16px relative leading-18px text-14px font-normal">{i18n.auto_router}</p>
          <ArrowDownIcon className="w-8px h-5px absolute right-16px accordion-arrow top-1/2 -translate-y-[calc(50%-2.5px)]" />
        </>
      )}

      <div className="flex justify-between items-center leading-18px text-14px font-normal">
        <RoutingDiagram sourceToken={sourceToken} destinationToken={destinationToken} routes={routes} />
      </div>

      <div className="my-16px h-2px bg-#FFF5E7" />

      <p className="flex justify-between items-center leading-18px text-14px text-gray-normal">{compiled(i18n.auto_router_tip, { dollar_price: networkFee || '$' })}</p>
    </Accordion>
  );
};

export default memo(AutoRouter);

export interface RoutingDiagramEntry {
  percent: string;
  path: [Token | null, Token | null, number][];
  protocol: Protocol;
}

/**
 * Loops through all routes on a trade and returns an array of diagram entries.
 */
export function getTokenPath(trade?: Trade): RoutingDiagramEntry[] {
  if (!trade) return [];
  return trade.route.map((route: Route[]) => {
    try {
      const routeAmountIn = route[0].amountIn;
      const routeAmountOut = route[route.length - 1].amountOut;
      const percent =
        trade.tradeType === TradeType.EXACT_INPUT
          ? new Unit(routeAmountIn).div(trade.amountIn).mul(100).toDecimalMinUnit(1)
          : new Unit(routeAmountOut).div(trade.amountOut).mul(100).toDecimalMinUnit(1);
      const path: RoutingDiagramEntry['path'] = [];
      for (let i = 0; i < route.length; i++) {
        const nextPool = route[i];
        const tokenIn = getUnwrapperTokenByAddress(nextPool.tokenIn.address);
        const tokenOut = getUnwrapperTokenByAddress(nextPool.tokenOut.address);
        const entry: RoutingDiagramEntry['path'][0] = [tokenIn, tokenOut, Number(nextPool.fee)];
        path.push(entry);
      }
      return {
        percent,
        path,
        protocol: Protocol.V3,
      };
    } catch (_) {
      return {
        percent: '0',
        path: [],
        protocol: Protocol.V3,
      };
    }
  });
}
