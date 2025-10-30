import React, { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import SelectedPriceRange from '@modules/Position/SelectedPriceRange';
import { usePosition } from '@service/earn';
import { useAccount } from '@service/account';
import useI18n from '@hooks/useI18n';
import { ReactComponent as ArrowLeftIcon } from '@assets/icons/arrow_left.svg';
import DetailHeader from './DetailHeader';
import Liquidity from './Liquidity';
import UnclaimedFees from './UnclaimedFees';

const transitions = {
  en: {
    back_to_positions: 'Back to My Positions',
  },
  zh: {
    back_to_positions: '返回我的头寸',
  },
} as const;

const LiquidityDetail: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const position = usePosition(Number(tokenId));

  const navigate = useNavigate();
  const account = useAccount();
  useEffect(() => {
    if (!account) {
      navigate('/pool')
    }
  }, [account]);

  return (
    <PageWrapper className="pt-56px lt-mobile:pt-4px pb-40px lt-md:pb-60px">
      <div className="mx-auto max-w-800px">
        <div className="mb-16px lt-mobile:mb-12px flex items-center pl-8px pr-16px">
          <Link to="/earn/my-positions" className="mr-auto inline-flex items-center no-underline leading-40px text-24px lt-mobile:text-18px text-gray-normal font-normal">
            <ArrowLeftIcon className="w-8px h-12px mr-16px lt-mobile:mr-12px" />
            {i18n.back_to_positions}
          </Link>
        </div>
        <BorderBox className="w-full p-16px pt-24px rounded-28px flex flex-col gap-16px" variant="gradient-white">
          <DetailHeader />
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
