import React, { Suspense, useEffect } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import Delay from '@components/Delay';
import Spin from '@components/Spin';
import PositionStatus from '@modules/Position/PositionStatus';
import TokenPair from '@modules/Position/TokenPair';
import PriceRange from '@modules/Position/PriceRange';
import useI18n from '@hooks/useI18n';
import { type PositionForUI, usePositionsForUI, useRefreshPositions } from '@service/position';
import { ReactComponent as PoolHandIcon } from '@assets/icons/pool_hand.svg';

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
        <p className="mt-12px lt-sm:mt-20px mb-132px lt-sm:mb-60px leading-28px text-center text-22px lt-sm:text-14px text-black-normal font-normal">
          {i18n.positions_appear_here}
        </p>
      </>
    );
  }
  return (
    <>
      {positions.map((position) => (
        <PositionItem key={position.id} position={position} />
      ))}
    </>
  );
};

let lastRefreshTime: dayjs.Dayjs | null = null;
const PoolPage: React.FC = () => {
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
    <Suspense
      fallback={
        <Delay delay={333}>
          <Spin className="!block mx-auto text-60px" />
        </Delay>
      }
    >
      <PoolContent />
    </Suspense>
  );
};

export default PoolPage;
