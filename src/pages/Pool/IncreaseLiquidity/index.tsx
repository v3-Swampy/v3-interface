import React, { useCallback, useMemo } from 'react';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';

const transitions = {
  en: {
    add_liquidity: 'Add Liquidity',
  },
  zh: {
    add_liquidity: '添加流动性',
  },
} as const;

const IncreaseLiquidity: React.FC = () => {
  return (
    <PageWrapper className="pt-56px">
      <BorderBox className="relative w-full p-16px rounded-28px flex gap-32px lt-md:gap-16px" variant="gradient-white">
        <div>1223</div>
      </BorderBox>
    </PageWrapper>
  );
};

export default IncreaseLiquidity;
