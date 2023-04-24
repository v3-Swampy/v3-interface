import React, { memo, useState, useCallback } from 'react';
import cx from 'clsx';
import Tooltip from '@components/Tooltip';
import Accordion from '@components/Accordion';
import useI18n, { compiled } from '@hooks/useI18n';
import { useSourceToken, useDestinationToken } from '@service/swap';
import { type useBestTrade } from '@service/pairs&pool';

const transitions = {
  en: {
    auto_router: 'Auto Router',
    auto_router_tip:
      'Best price route costs ~${dollar_price} in gas. This route optimizes your total output by considering split routes, multiple hops, and the gas cost of each step.',
  },
  zh: {
    auto_router: '自动路由',
    auto_router_tip: '最佳价格路由消耗的gas约为 ${dollar_price} 此路线通过考虑拆分路线、多跳和每一步的 gas 成本来优化您的总输出额。',
  },
} as const;

interface Props {
  bestTrade: ReturnType<typeof useBestTrade>;  
}

const AutoRouter: React.FC<Props> = ({ bestTrade }) => {
  const i18n = useI18n(transitions);
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();

  return (
    <Accordion
      className="mt-6px rounded-20px border-2px border-solid border-orange-light-hover"
      titleClassName="pt-16px pb-12px"
      contentClassName="px-24px"
      contentExpandClassName="pb-16px pt-12px"
    >
      {(expand) => (
        <>
          <p className="ml-24px relative leading-18px text-14px text-black-normal font-medium">{i18n.auto_router}</p>
          <span className="accordion-arrow i-ic:sharp-keyboard-arrow-down absolute right-16px top-1/2 -translate-y-[calc(50%-2.5px)] text-16px font-medium" />
        </>
      )}

      <p className="flex justify-between items-center leading-18px text-14px font-medium">123456</p>

      <div className="my-16px h-2px bg-#FFF5E7" />

      <p className="flex justify-between items-center leading-18px text-14px text-gray-normal font-medium">{compiled(i18n.auto_router_tip, { dollar_price: '4.33' })}</p>
    </Accordion>
  );
};

export default memo(AutoRouter);
