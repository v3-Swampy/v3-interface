import React, { useCallback, useMemo } from 'react';
import Button from '@components/Button';
import useI18n, { compiled } from '@hooks/useI18n';

const transitions = {
  en: {
    selected_range: 'Selected Range',
    min_price: 'Min Price',
    max_price: 'Max Price',
    price_desc: 'Your position will be 100% composed of {tokenSymbol} of this price',
  },
  zh: {
    selected_range: '已选范围',
    min_price: '最低价格',
    max_price: '最高价格',
    price_desc: 'Your position will be 100% composed of {tokenSymbol} of this price',
  },
} as const;


const SelectedRange: React.FC = () => {
  const i18n = useI18n(transitions);

  return <div>SelectedRange</div>;
};

export default SelectedRange;
