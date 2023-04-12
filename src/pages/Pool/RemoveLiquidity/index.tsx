import React from 'react';
import { Link, useParams } from 'react-router-dom';
// import Slider, { Range } from 'rc-slider';
// import 'rc-slider/assets/index.css';

import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import { PositionForUI, useLiquidityDetail } from '@service/pool-manage';
import Settings from '@modules/Settings';
import TokenPair from '@modules/TokenPair';
import Status from '@modules/Status';
const transitions = {
  en: {
    remove_liquidity: 'Remove Liquidity',
    max: 'Max',
    pooled: 'Pooled',
    preview: 'preview',
    amount: 'Amount',
  },
  zh: {
    remove_liquidity: 'Remove Liquidity',
    max: 'Max',
    pooled: 'Pooled',
    preview: 'preview',
    amount: 'Amount',
  },
} as const;

const RemoveLiquidity: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const detail: PositionForUI | undefined = useLiquidityDetail(Number(tokenId));

  if (!detail) return <div>loading...</div>;

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px">
        <div className="flex items-center mb-16px gap-8px">
          <span className="i-material-symbols:keyboard-arrow-left text-24px text-gray-normal" />
          <Link to={`/pool/${tokenId}`} className="mr-auto inline-flex items-center no-underline leading-30px text-24px text-orange-normal">
            {i18n.remove_liquidity}
          </Link>
          <Settings />
        </div>
        <BorderBox className="w-full p-16px rounded-28px flex justify-between gap-16px lt-md:gap-12px" variant="gradient-white">
          <div className="flex p-x-16px justify-between">
            <TokenPair position={detail} />
            <Status position={detail} />
          </div>
          <div className="bg-orange-light-hove">{/* <Slider /> */}</div>
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default RemoveLiquidity;
