import React, { useCallback, useMemo } from 'react';
import Button from '@components/Button';
import useI18n from '@hooks/useI18n';

const transitions = {
  en: {
    collect_fees: 'Collect Fees',
    unclaimed_fees: 'Unclaimed Fees',
  },
  zh: {
    collect_fees: '获取收益',
    unclaimed_fees: '待获取收益',
  },
} as const;


const UnclaimedFees: React.FC = () => {
  const i18n = useI18n(transitions);

  return <div>UnclaimedFees</div>;
};

export default UnclaimedFees;
