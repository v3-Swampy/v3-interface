import React from 'react';
import { type PositionForUI } from '@service/position';
import { trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as DoubleArrowIcon } from '@assets/icons/double_arrow.svg';

const PriceRange: React.FC<{ position: PositionForUI; }> = ({ position }) => {
  const { leftToken, rightToken, priceLowerForUI, priceUpperForUI } = position;

  const priceLowerStr = trimDecimalZeros(priceLowerForUI.toDecimalMinUnit(5));
  const _priceUpperStr = trimDecimalZeros(priceUpperForUI.toDecimalMinUnit(5));
  const priceUpperStr = _priceUpperStr === 'Infinity' ? '∞' : _priceUpperStr;

  return (
    <div className="flex items-center h-16px mt-4px text-12px font-medium">
      <span className="text-gray-normal">
        Min:&nbsp;
        <span className="text-black-normal">
          {priceLowerStr} {leftToken?.symbol} per {rightToken?.symbol}
        </span>
      </span>
      <DoubleArrowIcon className="mx-8px w-16px h-8px" />
      <span className="text-gray-normal">
        Max:&nbsp;
        <span className="text-black-normal">
          {priceUpperStr} {leftToken?.symbol} per {rightToken?.symbol}
        </span>
      </span>
    </div>
  );
};

export default PriceRange;
