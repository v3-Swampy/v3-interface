import React from 'react';
import { Link, useParams } from 'react-router-dom';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import SelectedPriceRange from '@modules/Position/SelectedPriceRange';
import { usePosition } from '@service/position';
import useI18n from '@hooks/useI18n';
import { ReactComponent as ArrowLeftIcon } from '@assets/icons/arrow_left.svg';
import DetailHeader from './DetailHeader';
import Liquidity from './Liquidity';
import UnclaimedFees from './UnclaimedFees';

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
  const { tokenId } = useParams();
  const position = usePosition(Number(tokenId));

  return (
    <PageWrapper className="pt-56px lt-mobile:pt-16px lt-md:pb-60px">
      <div className="mx-auto max-w-800px">
        <div className="flex items-center pl-8px pr-16px mb-16px">
          <Link to="/pool" className="mr-auto inline-flex items-center no-underline leading-40px text-18px text-gray-normal">
            <ArrowLeftIcon className="w-8px h-12px mr-16px lt-mobile:mr-12px" />
            {i18n.back_to_pools}
          </Link>
        </div>
        <BorderBox className="w-full p-16px rounded-28px flex flex-col gap-16px" variant="gradient-white">
          <div className="md:ml-16px">
            <DetailHeader />
          </div>
          <div className="flex gap-16px lt-md:flex-wrap">
            <Liquidity />
            <UnclaimedFees />
          </div>
          <SelectedPriceRange position={position} tokenId={tokenId} />
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default LiquidityDetail;
