import React from 'react';
import { Link, useParams } from 'react-router-dom';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import Settings from '@modules/Settings';
import SelectedPriceRange from '@modules/Position/SelectedPriceRange';
import { usePosition } from '@service/position';
import PairInfo from './PairInfo';
import IncreaseAmounts from './IncreaseAmounts';

const transitions = {
  en: {
    add_liquidity: 'Add Liquidity',
  },
  zh: {
    add_liquidity: '添加流动性',
  },
} as const;

const IncreaseLiquidity: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const position = usePosition(Number(tokenId));
  
  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px">
        <div className="flex items-center mb-16px gap-8px">
          <span className="i-material-symbols:keyboard-arrow-left text-24px text-gray-normal" />
          <Link to={`/pool/${tokenId}`} className="mr-auto inline-flex items-center no-underline leading-30px text-24px text-orange-normal">
            {i18n.add_liquidity}
          </Link>
          <Settings />
        </div>
        <BorderBox className="w-full p-16px rounded-28px flex justify-between gap-32px lt-md:gap-12px" variant="gradient-white">
          <div className="max-w-310px mt-8px">
            <PairInfo />
            <IncreaseAmounts />
          </div>
          <div className="mt-8px flex-1">
            <SelectedPriceRange position={position} tokenId={tokenId} />
          </div>
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default IncreaseLiquidity;
