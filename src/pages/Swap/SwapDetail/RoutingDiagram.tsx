import React from 'react';
import { Token } from '@service/tokens';
import Tooltip from '@components/Tooltip';
import { trimDecimalZeros } from '@utils/numberUtils';
import { RoutingDiagramEntry } from './AutoRouter';

const Pool: React.FC<{ tokenIn: Token | null; tokenOut: Token | null; feeAmount: number }> = ({ tokenIn, tokenOut, feeAmount }) => {
  return (
    <Tooltip text={`${tokenIn?.symbol}/${tokenOut?.symbol} ${feeAmount / 10000}% pool`}>
      <div className="flex items-center rounded-10px px-10px h-32px lt-mobile:h-26px bg-orange-light ">
        <div className="flex items-center mr-4px">
          <img className="w-24px h-24px lt-mobile:w-18px lt-mobile:h-18px" src={tokenIn?.logoURI} alt={`${tokenIn?.logoURI} icon`} />
          <img className="-ml-8px lt-mobile:-ml-6px w-24px h-24px lt-mobile:w-18px lt-mobile:h-18px" src={tokenOut?.logoURI} alt={`${tokenOut?.logoURI} icon`} />
        </div>
        <span className="text-black-normal text-14px lt-mobile:text-12px font-normal">{feeAmount / 10000}%</span>
      </div>
    </Tooltip>
  );
};

const Route: React.FC<{ entry: RoutingDiagramEntry }> = ({ entry: { percent, path, protocol } }) => {
  return (
    <div className="relative flex flex-1 items-center mx-8px px-16px">
      <div className="absolute flex justify-between items-center left-0 top-1/2 w-full h-0 border-0px border-b-2px border-dashed border-gray-light -translate-y-1/2">
        <span className="inline-block w-6px h-6px rounded-full bg-gray-light -translate-x-2px translate-y-1px" />
        <span className="inline-block w-6px h-6px rounded-full bg-gray-light translate-x-2px translate-y-1px" />
      </div>
      <span className="inline-block px-8px min-w-44px h-32px lt-mobile:h-26px leading-32px lt-mobile:leading-26px rounded-10px bg-gradient-orange text-14px lt-mobile:text-12pxp text-white-normal z-1">
        {trimDecimalZeros(percent)}%
      </span>
      <div className="flex flex-1 justify-evenly z-1">
        {path.map(([tokenIn, tokenOut, feeAmount], index) => (
          <Pool key={index} tokenIn={tokenIn} tokenOut={tokenOut} feeAmount={feeAmount} />
        ))}
      </div>
    </div>
  );
};

const RoutingDiagram: React.FC<{ sourceToken: Token | null; destinationToken: Token | null; routes: RoutingDiagramEntry[] }> = ({ sourceToken, destinationToken, routes }) => {
  return (
    <div className="flex flex-col w-full gap-16px">
      {routes.map((entry, index) => (
        <div className="flex items-center" key={index}>
          <img className="w-24px h-24px lt-mobile:w-18px lt-mobile:h-18px" src={sourceToken?.logoURI} alt={`${sourceToken?.logoURI} icon`} />
          <Route entry={entry} />
          <img className="w-24px h-24px lt-mobile:w-18px lt-mobile:h-18px" src={destinationToken?.logoURI} alt={`${destinationToken?.logoURI} icon`} />
        </div>
      ))}
    </div>
  );
};

export default RoutingDiagram;
