import React, { useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import { PositionForUI, useLiquidityDetail } from '@service/pool-manage';
import Settings from '@modules/Settings';
import PairInfo from './PairInfo';
import IncreaseAmounts from './IncreaseAmounts';
import SelectedRange from './SelectedRange';

const transitions = {
  en: {
    add_liquidity: 'Add Liquidity',
  },
  zh: {
    add_liquidity: '添加流动性',
  },
} as const;

const IncreaseLiquidity: React.FC | null = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const detail: PositionForUI | undefined = useLiquidityDetail(Number(tokenId));

  if (!detail) {
    return null;
  }

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px">
        <div className="flex items-center mb-16px gap-8px">
          <span className="i-material-symbols:keyboard-arrow-left text-24px text-gray-normal" />
          <Link to={`/pool/${tokenId}`} className="mr-auto inline-flex items-center no-underline leading-18px text-14px text-gray-normal">
            {i18n.add_liquidity}
          </Link>
          <Settings />
        </div>
        <BorderBox className="w-full p-16px rounded-28px flex justify-between gap-16px lt-md:gap-12px" variant="gradient-white">
          <div>
            <PairInfo detail={detail} />
            <IncreaseAmounts detail={detail} />
          </div>
          <SelectedRange detail={detail} />
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default IncreaseLiquidity;
