import React, { useMemo } from 'react';
import { type PositionForUI } from '@service/position';
import { trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as DoubleArrowIcon } from '@assets/icons/double_arrow.svg';

const PriceRange: React.FC<{ position: PositionForUI; type?: 'verticle' | 'horizontal' }> = ({ position, type = 'verticle' }) => {
  const { leftToken, rightToken, priceLowerForUI, priceUpperForUI } = position;

  const priceLowerStr = trimDecimalZeros(priceLowerForUI.toDecimalMinUnit(5));
  const _priceUpperStr = trimDecimalZeros(priceUpperForUI.toDecimalMinUnit(5));
  const priceUpperStr = _priceUpperStr === 'Infinity' ? '∞' : _priceUpperStr;

  // verticle is default
  // horizontal used in farming stakeLP list
  const classNames = useMemo(() => {
    const wrapper = 'flex items-center leading-16px mt-4px text-12px font-normal whitespace-nowrap';
    const price = 'text-gray-normal';
    const arrow = 'w-16px h-8px flex-shrink-0 mx-8px';

    return {
      verticle: {
        price: price + ' lt-mobile:w-full',
        arrow:
          arrow + ' lt-mobile:!mx-0px lt-mobile:w-12px lt-mobile:h-6px lt-mobile:absolute lt-mobile:left-0 lt-mobile:top-1/2 lt-mobile:-translate-y-1/2 lt-mobile:rotate-90deg',
        wrapper: wrapper + ' lt-mobile:relative lt-mobile:flex-wrap lt-mobile:pl-16px',
      },
      horizontal: {
        price,
        arrow,
        wrapper,
      },
    }[type];
  }, [type]);

  return (
    <div className={classNames.wrapper}>
      <span className={classNames.price}>
        Min:&nbsp;
        <span className="text-black-normal">
          {priceLowerStr} {rightToken?.symbol} per {leftToken?.symbol}
        </span>
      </span>
      <DoubleArrowIcon className={classNames.arrow} />
      <span className={classNames.price}>
        Max:&nbsp;
        <span className="text-black-normal">
          {priceUpperStr} {rightToken?.symbol} per {leftToken?.symbol}
        </span>
      </span>
    </div>
  );
};

export default PriceRange;
