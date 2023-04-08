import React, { Suspense, useMemo } from 'react';
import { FeeAmount } from '@service/pairs&pool';

const TokenPair: React.FC<{ quoteTokenSymbol?: string; quoteTokenLogo?: string; baseTokenSymbol?: string; baseTokenLogo?: string; fee: FeeAmount }> = ({
  quoteTokenSymbol,
  quoteTokenLogo,
  baseTokenSymbol,
  baseTokenLogo,
  fee,
}) => {
  return (
    <div className="flex items-center">
      <img className="w-24px h-24px" src={quoteTokenLogo} alt={`${quoteTokenSymbol} icon`} />
      <img className="w-24px h-24px -ml-8px" src={baseTokenLogo} alt={`${baseTokenSymbol} icon`} />
      <span className="mx-4px text-14px text-black-normal font-medium">
        {quoteTokenSymbol} / {baseTokenSymbol}
      </span>
      <span className="inline-block px-8px h-20px leading-20px rounded-100px bg-orange-light text-center text-14px text-orange-normal font-medium">{fee / 10000}%</span>
    </div>
  );
};

export default TokenPair;
