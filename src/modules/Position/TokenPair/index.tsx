/**
 * token pair including the token symbol / logo/ fee in liquidity page
 */
import React, { type ComponentProps } from 'react';
import cx from 'clsx';
import { type PositionForUI } from '@service/position';
import { type Token } from '@service/tokens';

interface Props extends ComponentProps<'div'> {
  position: PositionForUI;
  inverted?: boolean;
  showFee?: boolean;
  leftToken?: Token;
  rightToken?: Token;
  symbolClassName?: string;
  feeClassName?: string;
}
const TokenPair: React.FC<Props> = ({ position, leftToken, rightToken, inverted = false, showFee = true, className, symbolClassName, feeClassName, ...props }) => {
  const { fee } = position;
  const leftTokenForUI = leftToken ? leftToken : !inverted ? position?.leftToken : position?.rightToken;
  const rightTokenForUI = rightToken ? rightToken : !inverted ? position?.rightToken : position?.leftToken;

  return (
    <div className={cx('flex items-center text-14px', className)} {...props}>
      <img className="w-24px h-24px" src={leftTokenForUI?.logoURI} alt={`${leftTokenForUI?.logoURI} icon`} />
      <img className="w-24px h-24px -ml-8px" src={rightTokenForUI?.logoURI} alt={`${rightTokenForUI?.logoURI} icon`} />
      <span className={`mx-4px text-black-normal font-medium ${symbolClassName}`}>
        {leftTokenForUI?.symbol} / {rightTokenForUI?.symbol}
      </span>
      {showFee && (
        <span className={`inline-block px-8px h-20px leading-20px rounded-100px bg-orange-light text-center text-14px text-orange-normal font-normal ${feeClassName}`}>
          {fee / 10000}%
        </span>
      )}
    </div>
  );
};

export default TokenPair;
