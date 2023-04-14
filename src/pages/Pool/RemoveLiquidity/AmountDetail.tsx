import React from 'react';
import useI18n from '@hooks/useI18n';
import { useParams } from 'react-router-dom';
import { type PositionForUI, usePosition } from '@service/position';

const transitions = {
  en: {
    pooled: 'Pooled',
  },
  zh: {
    pooled: 'Pooled',
  },
} as const;

const AmountItem: React.FC<{ tokenSymbol: string; amount: string; logoURI: string }> = ({ tokenSymbol, amount, logoURI }) => {
  const i18n = useI18n(transitions);

  return (
    <div className="font-medium text-xs flex items-center justify-between">
      <div>
        {i18n.pooled} {tokenSymbol}
      </div>
      <div className="flex items-center">
        <span className="mr-8px">{amount}</span>
        <img className="w-24px h-24px" src={logoURI} alt={`${tokenSymbol} icon`} />
      </div>
    </div>
  );
};
const AmountDetail: React.FC<{ tokenId: string; leftRemoveAmount: string; rightRemoveAmount: string }> = ({ leftRemoveAmount, rightRemoveAmount, tokenId }) => {
  const position: PositionForUI | undefined = usePosition(Number(tokenId));
  const { leftToken, rightToken } = position || {};

  return (
    <div className="bg-orange-light-hover  rounded-20px px-16px py-18px mt-16px">
      <AmountItem tokenSymbol={leftToken?.symbol || ''} amount={leftRemoveAmount} logoURI={leftToken?.logoURI || ''} />
      <div className="h-8px" />
      <AmountItem tokenSymbol={rightToken?.symbol || ''} amount={rightRemoveAmount} logoURI={rightToken?.logoURI || ''} />
    </div>
  );
};

export default AmountDetail;
