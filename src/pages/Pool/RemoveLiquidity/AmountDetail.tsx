import React from 'react';
import useI18n from '@hooks/useI18n';

const transitions = {
  en: {
    pooled: 'Pooled',
  },
  zh: {
    pooled: 'Pooled',
  },
} as const;

const AmountItem: React.FC = () => {
  const i18n = useI18n(transitions);

  return (
    <div className="font-medium text-xs leading-18px flex justify-between">
      <div>{i18n.pooled} BTC</div>
      <div>
        <span className="mr-8px">0.11</span>
        <span> img</span>
      </div>
    </div>
  );
};
const AmountDetail: React.FC = () => {
  return (
    <div className="bg-orange-light-hover  rounded-20px px-16px py-18px mt-16px">
      <AmountItem />
      <div className="h-14px" />
      <AmountItem />
    </div>
  );
};

export default AmountDetail;
