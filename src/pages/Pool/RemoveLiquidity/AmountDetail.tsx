import React from 'react';
import useI18n from '@hooks/useI18n';
import { useParams } from 'react-router-dom';
import { type PositionForUI, usePosition } from '@service/position';

const transitions = {
  en: {
    pooled: 'Pooled',
    earnedFees: '$1 Fees Earned',
  },
  zh: {
    pooled: 'Pooled',
    earnedFees: '$1 Fees Earned',
  },
} as const;

const AmountItem: React.FC<{ className?: string; tokenSymbol: string; amount: string; logoURI: string; title: string; amountWidthStyle?: string }> = ({
  tokenSymbol,
  amount,
  logoURI,
  title,
  className = '',
  amountWidthStyle = 'w-480px',
}) => {
  return (
    <div className={`font-medium text-xs flex items-center justify-between ${className}`}>
      <div>{title}</div>
      <div className="flex items-center">
        <div className={`mr-8px text-ellipsis whitespace-nowrap ${amountWidthStyle} overflow-hidden text-right`}>{amount}</div>
        <img className="w-24px h-24px" src={logoURI} alt={`${tokenSymbol} icon`} />
      </div>
    </div>
  );
};

const AmountDetail: React.FC<{
  tokenId: string;
  leftRemoveAmount: string;
  rightRemoveAmount: string;
  leftEarnedFees: string;
  rightEarnedFees: string;
  amountWidthStyle?: string;
}> = ({ leftRemoveAmount, rightRemoveAmount, leftEarnedFees, rightEarnedFees, tokenId, amountWidthStyle }) => {
  const position: PositionForUI | undefined = usePosition(Number(tokenId));
  const { leftToken, rightToken } = position || {};
  const i18n = useI18n(transitions);

  return (
    <div className="bg-orange-light-hover  rounded-20px px-16px py-18px mt-16px">
      <AmountItem
        amountWidthStyle={amountWidthStyle}
        title={`${i18n.pooled} ${leftToken?.symbol || ''}`}
        tokenSymbol={leftToken?.symbol || ''}
        amount={leftRemoveAmount}
        logoURI={leftToken?.logoURI || ''}
      />
      <AmountItem
        amountWidthStyle={amountWidthStyle}
        title={`${i18n.pooled} ${rightToken?.symbol || ''}`}
        tokenSymbol={rightToken?.symbol || ''}
        amount={rightRemoveAmount}
        logoURI={rightToken?.logoURI || ''}
        className="mt-8px"
      />
      <AmountItem
        amountWidthStyle={amountWidthStyle}
        title={`${i18n.earnedFees.replace('$1', leftToken?.symbol || '')}`}
        tokenSymbol={leftToken?.symbol || ''}
        amount={leftEarnedFees}
        logoURI={leftToken?.logoURI || ''}
        className="mt-16px"
      />
      <AmountItem
        amountWidthStyle={amountWidthStyle}
        title={`${i18n.earnedFees.replace('$1', rightToken?.symbol || '')}`}
        tokenSymbol={rightToken?.symbol || ''}
        amount={rightEarnedFees}
        logoURI={rightToken?.logoURI || ''}
        className="mt-8px"
      />
    </div>
  );
};

export default AmountDetail;
