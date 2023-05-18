import React from 'react';
import { type PositionForUI } from '@service/position';
import { trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as DoubleArrowIcon } from '@assets/icons/double_arrow.svg';

const PriceRange: React.FC<{ position: PositionForUI }> = ({ position }) => {
  const { leftToken, rightToken, priceLowerForUI, priceUpperForUI } = position;

  const priceLowerStr = trimDecimalZeros(priceLowerForUI.toDecimalMinUnit(5));
  const _priceUpperStr = trimDecimalZeros(priceUpperForUI.toDecimalMinUnit(5));
  const priceUpperStr = _priceUpperStr === 'Infinity' ? '∞' : _priceUpperStr;

  return (
    <div className="lt-mobile:relative flex lt-mobile:flex-wrap items-center lt-mobile:pl-16px leading-16px mt-4px text-12px font-medium whitespace-nowrap">
      <span className="text-gray-normal lt-mobile:w-full">
        Min:&nbsp;
        <span className="text-black-normal">
          {priceLowerStr} {leftToken?.symbol} per {rightToken?.symbol}
        </span>
      </span>
      <DoubleArrowIcon className="mobile:mx-8px w-16px h-8px lt-mobile:w-12px lt-mobile:h-6px flex-shrink-0 lt-mobile:absolute lt-mobile:left-0 lt-mobile:top-1/2 lt-mobile:-translate-y-1/2 lt-mobile:rotate-90deg" />
      <span className="text-gray-normal lt-mobile:w-full">
        Max:&nbsp;
        <span className="text-black-normal">
          {priceUpperStr} {leftToken?.symbol} per {rightToken?.symbol}
        </span>
      </span>
    </div>
  );
};

export default PriceRange;
