import React, { Suspense, useEffect } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import Delay from '@components/Delay';
import Spin from '@components/Spin';
import PositionStatus from '@modules/Position/PositionStatus';
import TokenPair from '@modules/Position/TokenPair';
import PriceRange from '@modules/Position/PriceRange';
import useI18n from '@hooks/useI18n';
import { type PositionForUI, usePositionsForUI, useRefreshPositions } from '@service/position';
import { ReactComponent as PoolHandIcon } from '@assets/icons/pool_hand.svg';
import { ReactComponent as AddIcon } from '@assets/icons/add.svg';

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
  return (
    <Link to={String(position.id)} className="no-underline">
      <div className="mt-6px lt-sm:mt-8px sm:px-24px lt-sm:py-8px sm:h-80px rounded-16px flex lt-sm:flex-wrap-reverse justify-between items-center hover:bg-orange-light-hover cursor-pointer transition-colors">
        <div className="lt-sm:w-full lt-sm:mt-8px">
          <TokenPair position={position} />
          <PriceRange position={position} />
        </div>
        <PositionStatus position={position} />
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
        <PoolHandIcon className="mt-116px lt-sm:mt-52px block mx-auto w-50.5px h-32px" />
        <p className="mt-12px lt-sm:mt-20px mb-132px lt-sm:mb-60px leading-28px text-center text-22px lt-sm:text-14px text-black-normal font-medium">
          {i18n.positions_appear_here}
        </p>
      </>
    );
  }
  return (
    <>
      <div className="inline-block mb-10px lt-sm:mb-16px sm:px-24px h-40px leading-40px lt-sm:h-18px lt-sm:leading-18px rounded-100px text-center text-14px text-black-normal font-medium sm:bg-orange-light-hover ">
        {i18n.your_positions} ({positions.length})
      </div>
      <div className="sm:display-none h-1px bg-orange-light" />

      {positions.map((position) => (
        <PositionItem key={position.id} position={position} />
      ))}
    </>
  );
};

let lastRefreshTime: dayjs.Dayjs | null = null;
const PoolPage: React.FC = () => {
  const i18n = useI18n(transitions);
  const refreshPositions = useRefreshPositions();
  useEffect(() => {
    if (lastRefreshTime) {
      if (dayjs().diff(lastRefreshTime, 'second') > 50) {
        lastRefreshTime = dayjs();
        refreshPositions();
      }
    } else {
      lastRefreshTime = dayjs();
    }
  }, []);

  return (
    <PageWrapper className="pt-56px lt-mobile:pt-4px pb-40px">
      <div className="mx-auto max-w-800px">
        <div className="mb-16px lt-mobile:mb-12px flex justify-between items-center pl-16px leading-30px text-24px lt-mobile:text-18px text-orange-normal font-medium">
          {i18n.pool}

          <Link to="/pool/add_liquidity" className="no-underline">
            <Button color="gradient" className="px-24px h-40px rounded-100px">
              <AddIcon className="mr-8px w-12px h-12px" />
              {i18n.new_positions}
            </Button>
          </Link>
        </div>
        <Suspense
          fallback={
            <Delay delay={333}>
              <Spin className="!block mx-auto text-60px" />
            </Delay>
          }
        >
          <BorderBox className="relative w-full p-16px pt-24px rounded-28px group lt-mobile:rounded-4" variant="gradient-white">
            <PoolContent />
          </BorderBox>
        </Suspense>
      </div>
    </PageWrapper>
  );
};

export default PoolPage;
