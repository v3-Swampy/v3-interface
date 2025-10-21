/**
 * token pair including the token symbol / logo/ fee in liquidity page
 */
import React, { type ComponentProps } from 'react';
import cx from 'clsx';
import { type PositionForUI } from '@service/position';

interface Props extends ComponentProps<'div'> {
  position: PositionForUI;
  showFee?: false | number;
  symbolClassName?: string;
  feeClassName?: string;
}
const TokenPair: React.FC<Props> = ({ position, showFee = true, className, symbolClassName, feeClassName, ...props }) => {
  const { fee } = position;
  const leftToken = position?.leftToken;
  const rightToken = position?.rightToken;

  return (
    <div className={cx('flex items-center text-14px', className)} {...props}>
      <img className="w-24px h-24px" src={leftToken?.logoURI} alt={`${leftToken?.logoURI} icon`} />
      <img className="w-24px h-24px -ml-8px" src={rightToken?.logoURI} alt={`${rightToken?.logoURI} icon`} />
      <span className={`mx-4px text-black-normal font-medium ${symbolClassName}`}>
        {leftToken?.symbol} / {rightToken?.symbol}
      </span>
      {showFee !== false && (
        <span className={`inline-block px-8px h-20px leading-20px rounded-100px bg-orange-light text-center text-14px text-orange-normal font-normal ${feeClassName}`}>
          {(typeof showFee === 'number' ? showFee : fee) / 10000}%
        </span>
      )}
    </div>
  );
};

export default TokenPair;
