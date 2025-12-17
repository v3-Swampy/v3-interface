/**
 * token pair including the token symbol / logo/ fee in liquidity page
 */
import React, { type ComponentProps } from 'react';
import cx from 'clsx';
import { type PositionEnhanced } from '@service/earn';
import { type Token } from '@service/tokens';

interface Props extends ComponentProps<'div'> {
  position: PositionEnhanced;
  showFee?: false | number;
  leftToken?: Token;
  rightToken?: Token;
  symbolClassName?: string;
  feeClassName?: string;
}
const TokenPair: React.FC<Props> = ({ position, leftToken, rightToken, showFee = true, className, symbolClassName, feeClassName, ...props }) => {
  const { fee } = position;
  const leftTokenForUI = leftToken ? leftToken : position?.leftToken;
  const rightTokenForUI = rightToken ? rightToken : position?.rightToken;

  return (
    <div className={cx('flex items-center text-14px', className)} {...props}>
      <img className="w-24px h-24px" src={leftTokenForUI?.logoURI} alt={`${leftTokenForUI?.logoURI} icon`} />
      <img className="w-24px h-24px -ml-8px" src={rightTokenForUI?.logoURI} alt={`${rightTokenForUI?.logoURI} icon`} />
      <span className={`mx-4px text-black-normal font-medium ${symbolClassName}`}>
        {leftTokenForUI?.symbol === 'WCFX' ? 'CFX' : leftTokenForUI?.symbol} / {rightTokenForUI?.symbol === 'WCFX' ? 'CFX' : rightTokenForUI?.symbol}
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
