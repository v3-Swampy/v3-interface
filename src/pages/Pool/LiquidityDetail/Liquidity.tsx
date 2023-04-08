import React, { useCallback, useMemo } from 'react';
import useI18n from '@hooks/useI18n';

const transitions = {
  en: {
    liquidity: 'Liquidity',
  },
  zh: {
    liquidity: '增加流动性',
  },
} as const;


const Liquidity: React.FC = () => {
  const i18n = useI18n(transitions);

  return <div>Liquidity</div>;
};

export default Liquidity;
