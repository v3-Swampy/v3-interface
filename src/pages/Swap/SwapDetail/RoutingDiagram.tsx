import React from 'react';
import { Token } from '@service/tokens';
import Tooltip from '@components/Tooltip';
import { RoutingDiagramEntry } from './AutoRouter';

const Pool: React.FC<{ tokenIn: Token | null; tokenOut: Token | null; feeAmount: number }> = ({ tokenIn, tokenOut, feeAmount }) => {
  return (
    <Tooltip text={`${tokenIn?.symbol}/${tokenOut?.symbol} ${feeAmount / 10000}% pool`}>
      <div className="flex bg-orange-light rounded-10px px-10px py-4px">
        <div className="flex items-center mr-4px">
          <img className="w-24px h-24px" src={tokenIn?.logoURI} alt={`${tokenIn?.logoURI} icon`} />
          <img className="w-24px h-24px -ml-8px" src={tokenOut?.logoURI} alt={`${tokenOut?.logoURI} icon`} />
        </div>
        <span className="text-black-normal text-14px leading-20px font-medium">{feeAmount / 10000}%</span>
      </div>
    </Tooltip>
  );
};

const Route: React.FC<{ entry: RoutingDiagramEntry }> = ({ entry: { percent, path, protocol }}) => {
  return (
    <div className="flex flex-1 items-center">
      <div className="flex">
        <span className="mx-4px">{percent}%</span>
      </div>
      <div className="flex flex-1 justify-between">
        {path.map(([tokenIn, tokenOut, feeAmount], index) => (
          <Pool key={index} tokenIn={tokenIn} tokenOut={tokenOut} feeAmount={feeAmount} />
        ))}
      </div>
    </div>
  );
};

const RoutingDiagram: React.FC<{ sourceToken: Token | null; destinationToken: Token | null; routes: RoutingDiagramEntry[] }> = ({ sourceToken, destinationToken, routes }) => {
  return (
    <div className="flex flex-col w-full">
      {routes.map((entry, index) => (
        <div className="flex items-center" key={index}>
          <img className="w-24px h-24px" src={sourceToken?.logoURI} alt={`${sourceToken?.logoURI} icon`} />
          <Route entry={entry} />
          <img className="w-24px h-24px ml-4px" src={destinationToken?.logoURI} alt={`${destinationToken?.logoURI} icon`} />
        </div>
      ))}
    </div>
  );
};

export default RoutingDiagram;
