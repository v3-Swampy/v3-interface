import React from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import DetailHeader from './DetailHeader';
import Liquidity from './Liquidity';
import UnclaimedFees from './UnclaimedFees';
import SelectedPriceRange from '@modules/SelectedPriceRange';

const transitions = {
  en: {
    back_to_pools: 'Back to Pools',
  },
  zh: {
    back_to_pools: '返回矿池',
  },
} as const;

const LiquidityDetail: React.FC = () => {
  const i18n = useI18n(transitions);

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px">
        <div className="flex items-center mb-16px gap-8px">
          <span className="i-material-symbols:keyboard-arrow-left text-24px text-gray-normal" />
          <Link to="/pool" className="mr-auto inline-flex items-center no-underline leading-18px text-14px text-gray-normal">
            {i18n.back_to_pools}
          </Link>
        </div>
        <BorderBox className="w-full p-16px rounded-28px flex flex-col gap-16px lt-md:gap-12px" variant="gradient-white">
          <div className="ml-16px">
            <DetailHeader />
          </div>
          <div className="flex gap-16px lt-md:gap-12px">
            <div className="flex flex-1 min-w-0">
              <Liquidity />
            </div>
            <div className="flex flex-1 min-w-0">
              <UnclaimedFees />
            </div>
          </div>
          <SelectedPriceRange />
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default LiquidityDetail;
