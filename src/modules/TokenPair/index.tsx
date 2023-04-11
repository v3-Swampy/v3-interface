import React from 'react';
import { type PositionForUI } from '@service/pool-manage';

const TokenPair: React.FC<{ position: PositionForUI; inverted?: boolean }> = ({ position, inverted = false }) => {
  const { leftToken, rightToken, fee } = position;
  const leftTokenForUI = !inverted ? leftToken : rightToken;
  const rightTokenForUI = !inverted ? rightToken : leftToken;

  return (
    <div className="flex items-center">
      <img className="w-24px h-24px" src={leftTokenForUI?.logoURI} alt={`${leftTokenForUI?.logoURI} icon`} />
      <img className="w-24px h-24px -ml-8px" src={rightTokenForUI?.logoURI} alt={`${rightTokenForUI?.logoURI} icon`} />
      <span className="mx-4px text-14px text-black-normal font-medium">
        {leftTokenForUI?.symbol} / {rightTokenForUI?.symbol}
      </span>
      <span className="inline-block px-8px h-20px leading-20px rounded-100px bg-orange-light text-center text-14px text-orange-normal font-medium">{fee / 10000}%</span>
    </div>
  );
};

export default TokenPair;
