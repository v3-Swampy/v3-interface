import React from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Tooltip from '@components/Tooltip';
import useI18n from '@hooks/useI18n';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';


const transitions = {
  en: {
    price_impact_tips: 'A swap of this size may have a high price impact, given the current liquidity in the pool. There may be a large difference between the amount of your input token and what you will receive in the output token',
  },
  zh: {
    price_impact_tips: 'A swap of this size may have a high price impact, given the current liquidity in the pool. There may be a large difference between the amount of your input token and what you will receive in the output token',
  },
} as const;


interface Props {
  largerPriceImpact?: Unit;
}

const PriceImpactWarning: React.FC<Props> = ({ largerPriceImpact }) => {
  const i18n = useI18n(transitions);
  return <div
    className="flex items-center justify-between pt-16px pb-12px pl-24px pr-16px rounded-20px border-2px border-solid border-orange-light-hover mt-6px text-14px leading-18px">
    <span className="text-black-light">Price impact warning</span>
    <Tooltip text={i18n.price_impact_tips} placement="bottom" interactive delay={[888, 333]}>
      <div className="flex items-center">
        <span className="text-black-normal font-bold">{largerPriceImpact ? largerPriceImpact?.mul(100)?.toDecimalMinUnit(2) : '--'}%</span>
        <InfoIcon className="w-12px h-12px ml-6px mb-2px" />
      </div>
    </Tooltip>
  </div>
}

export default PriceImpactWarning;