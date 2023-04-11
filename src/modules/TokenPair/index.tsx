import React from 'react';
import { type PositionForUI } from '@service/pool-manage';

const TokenPair: React.FC<{ position: PositionForUI; showFee?: boolean | undefined }> = ({ position, showFee = true }) => {
  const { leftToken, rightToken, fee } = position;
  return (
    <div className="flex items-center">
      <img className="w-24px h-24px" src={leftToken?.logoURI} alt={`${leftToken?.logoURI} icon`} />
      <img className="w-24px h-24px -ml-8px" src={rightToken?.logoURI} alt={`${rightToken?.logoURI} icon`} />
      <span className="mx-4px text-14px text-black-normal font-medium">
        {leftToken?.symbol} / {rightToken?.symbol}
      </span>
      {showFee && (
        <span className="inline-block px-8px h-20px leading-20px rounded-100px bg-orange-light text-center text-14px text-orange-normal font-medium">{fee / 10000}%</span>
      )}
    </div>
  );
};

export default TokenPair;
