/**
 * token pair including the token symbol / logo/ fee in liquidity page
 */
import React from 'react';
import { type PositionForUI } from '@service/position';
import { type Token } from '@service/tokens';

const TokenPair: React.FC<{ position: PositionForUI; inverted?: boolean; showFee?: boolean; leftToken?: Token; rightToken?: Token }> = ({
  position,
  leftToken,
  rightToken,
  inverted = false,
  showFee = true,
}) => {
  const { fee } = position;
  const leftTokenForUI = leftToken ? leftToken : !inverted ? position?.leftToken : position?.rightToken;
  const rightTokenForUI = rightToken ? rightToken : !inverted ? position?.rightToken : position?.leftToken;

  return (
    <div className="flex items-center">
      <img className="w-24px h-24px" src={leftTokenForUI?.logoURI} alt={`${leftTokenForUI?.logoURI} icon`} />
      <img className="w-24px h-24px -ml-8px" src={rightTokenForUI?.logoURI} alt={`${rightTokenForUI?.logoURI} icon`} />
      <span className="mx-4px text-14px text-black-normal font-bold">
        {leftTokenForUI?.symbol} / {rightTokenForUI?.symbol}
      </span>
      {showFee && (
        <span className="inline-block px-8px h-20px leading-20px rounded-100px bg-orange-light text-center text-14px text-orange-normal font-medium">{fee / 10000}%</span>
      )}
    </div>
  );
};

export default TokenPair;
