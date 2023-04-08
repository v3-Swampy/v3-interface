import React, { Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import Spin from '@components/Spin';
import Status from '@modules/Status';
import TokenPair from '@modules/TokenPair';
import useI18n from '@hooks/useI18n';
import { type PositionForUI, usePositionsForUI } from '@service/pool-manage';
import { trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as PoolHandIcon } from '@assets/icons/pool_hand.svg';
import { ReactComponent as DoubleArrowIcon } from '@assets/icons/double_arrow.svg';

const transitions = {
  en: {
    pool: 'Pool',
    your_positions: 'Your Positions',
    new_positions: 'New Positions',
    positions_appear_here: 'Your active liquidity positions will appear here.',
  },
  zh: {
    pool: '流动池',
    your_positions: '你的仓位',
    new_positions: '新仓位',
    positions_appear_here: '您的流动性仓位将在此显示。',
  },
} as const;

const PositionItem: React.FC<{ position: PositionForUI }> = ({ position }) => {
  const { leftToken, rightToken, priceLowerForUI, priceUpperForUI, id } = position;

  const priceLowerStr = trimDecimalZeros(priceLowerForUI.toDecimalMinUnit(5));
  const _priceUpperStr = trimDecimalZeros(priceUpperForUI.toDecimalMinUnit(5));
  const priceUpperStr = _priceUpperStr === 'NaN' ? '∞' : _priceUpperStr;

  return (
    <Link to={String(id)} className="no-underline">
      <div className="mt-6px px-24px h-80px rounded-16px flex justify-between items-center hover:bg-orange-light-hover cursor-pointer transition-colors">
        <div className="inline-block">
          <TokenPair position={position} />
          <div className="flex items-center h-16px mt-4px text-12px font-medium">
            <span className="text-gray-normal">
              Min:&nbsp;
              <span className="text-black-normal">
                {priceLowerStr} {leftToken?.symbol} per {rightToken?.symbol}
              </span>
            </span>
            <DoubleArrowIcon className="mx-8px w-16px h-8px" />
            <span className="text-gray-normal">
              Max:&nbsp;
              <span className="text-black-normal">
                {priceUpperStr} {leftToken?.symbol} per {rightToken?.symbol}
              </span>
            </span>
          </div>
        </div>
        <Status position={position} />
      </div>
    </Link>
  );
};

const PoolContent: React.FC = () => {
  const i18n = useI18n(transitions);
  const positions = usePositionsForUI();

  if (!positions?.length) {
    return (
      <>
        <PoolHandIcon className="mt-116px block mx-auto w-50.5px h-32px" />
        <p className="mt-12px mb-132px leading-28px text-center text-22px text-black-normal">{i18n.positions_appear_here}</p>
      </>
    );
  }
  return (
    <>
      <div className="inline-block mb-10px px-24px h-40px leading-40px rounded-100px text-center text-14px text-black-normal font-medium bg-orange-light-hover ">
        {i18n.your_positions} ({positions.length})
      </div>
      {positions.map((position) => (
        <PositionItem key={position.id} position={position} />
      ))}
    </>
  );
};

const PoolPage: React.FC = () => {
  const i18n = useI18n(transitions);

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px ">
        <div className="flex justify-between items-center pl-16px mb-16px leading-30px text-24px text-orange-normal font-medium">
          {i18n.pool}

          <Link to="/pool/add_liquidity" className="no-underline">
            <Button color="gradient" className="px-24px h-40px rounded-100px">
              <span className="i-material-symbols:add mr-8px text-white-normal text-24px font-medium" />
              {i18n.new_positions}
            </Button>
          </Link>
        </div>
        <BorderBox className="relative w-full p-16px rounded-28px" variant="gradient-white">
          <Suspense fallback={<Spin className="!block mx-auto text-60px" />}>
            <PoolContent />
          </Suspense>
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default PoolPage;
