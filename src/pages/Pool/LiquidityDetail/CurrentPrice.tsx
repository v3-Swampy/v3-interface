import React, { useCallback, useMemo } from 'react';
import useI18n from '@hooks/useI18n';

const transitions = {
  en: {
    current_price: 'Current Price',
  },
  zh: {
    current_price: '当前价格',
  },
} as const;


const Liquidity: React.FC = () => {
  const i18n = useI18n(transitions);

  return <div>Liquidity</div>;
};

export default Liquidity;
