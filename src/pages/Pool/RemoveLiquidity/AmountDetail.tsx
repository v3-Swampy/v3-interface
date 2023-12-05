import React from 'react';
import cx from 'clsx';
import useI18n from '@hooks/useI18n';
import { usePosition } from '@service/position';
import { trimDecimalZeros } from '@utils/numberUtils';

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

const AmountItem: React.FC<{ className?: string; tokenSymbol: string; amount: string; logoURI: string; title: string; }> = ({
  tokenSymbol,
  amount,
  logoURI,
  title,
  className = '',
}) => {
  return (
    <div className={cx('font-medium text-xs flex items-center justify-between lt-tiny:flex-wrap', className)}>
      <span className='whitespace-nowrap'>{title}</span>
      <div className="flex items-center">
        <div className='mr-8px text-ellipsis whitespace-nowrap overflow-hidden text-right'>{trimDecimalZeros(amount)}</div>
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
}> = ({ leftRemoveAmount, rightRemoveAmount, leftEarnedFees, rightEarnedFees, tokenId }) => {
  const position = usePosition(Number(tokenId));
  const { leftToken, rightToken } = position || {};
  const i18n = useI18n(transitions);

  return (
    <div className="bg-orange-light-hover  rounded-20px px-16px py-18px mt-16px">
      <AmountItem
        title={`${i18n.pooled} ${leftToken?.symbol || ''}`}
        tokenSymbol={leftToken?.symbol || ''}
        amount={leftRemoveAmount}
        logoURI={leftToken?.logoURI || ''}
      />
      <AmountItem
        title={`${i18n.pooled} ${rightToken?.symbol || ''}`}
        tokenSymbol={rightToken?.symbol || ''}
        amount={rightRemoveAmount}
        logoURI={rightToken?.logoURI || ''}
        className="mt-8px"
      />
      <AmountItem
        title={`${i18n.earnedFees.replace('$1', leftToken?.symbol || '')}`}
        tokenSymbol={leftToken?.symbol || ''}
        amount={leftEarnedFees}
        logoURI={leftToken?.logoURI || ''}
        className="mt-16px"
      />
      <AmountItem
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
