import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import Spin from '@components/Spin';
import useI18n from '@hooks/useI18n';
import { usePositions, PositionStatus } from '@service/pools-test';
import { usePositions as usePositions2 } from '@service/pool-manage';
import { ReactComponent as PoolHandIcon } from '@assets/icons/pool_hand.svg';
import { ReactComponent as SuccessIcon } from '@assets/icons/pool_success.svg';
import { ReactComponent as WarningIcon } from '@assets/icons/pool_warning.svg';
import { ReactComponent as ErrorIcon } from '@assets/icons/pool_error.svg';
import { ReactComponent as DoubleArrowIcon } from '@assets/icons/double_arrow.svg';

const transitions = {
  en: {
    pool: 'Pool',
    your_positions: 'Your Positions',
    new_positions: 'New Positions',
    positions_appear_here: 'Your active liquidity positions will appear here.',
    in_range: 'In Range',
    out_of_range: 'Out of Range',
    closed: 'Closed',
  },
  zh: {
    pool: '流动池',
    your_positions: '你的仓位',
    new_positions: '新仓位',
    positions_appear_here: '您的流动性仓位将在此显示。',
    in_range: '范围内',
    out_of_range: '超范围',
    closed: '已关闭',
  },
} as const;

const PositionStatuMap = {
  [PositionStatus.InRange]: {
    Icon: <SuccessIcon className="ml-4px w-18px h-18px" />,
    color: '#009595',
    text: 'in_range',
  },
  [PositionStatus.OutOfRange]: {
    Icon: <WarningIcon className="ml-4px w-18px h-18px" />,
    color: '#FFB75D',
    text: 'out_of_range',
  },
  [PositionStatus.Closed]: {
    Icon: <ErrorIcon className="ml-4px w-18px h-18px" />,
    color: '#C2C4D0',
    text: 'closed',
  },
} as const;

const PoolContent: React.FC = () => {
  const i18n = useI18n(transitions);
  const positions = usePositions();
  const positions2 = usePositions2();
  console.log(positions2)
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
        <div key={position.id} className="mt-6px px-24px h-80px rounded-16px flex justify-between items-center hover:bg-orange-light-hover cursor-pointer transition-colors">
          <div className="inline-block">
            <div className="flex items-center">
              <img className="w-24px h-24px" src={position.tokenA.logoURI} alt={`${position.tokenA.symbol} icon`} />
              <img className="w-24px h-24px -ml-8px" src={position.tokenB.logoURI} alt={`${position.tokenB.symbol} icon`} />
              <span className="mx-4px text-14px text-black-normal font-medium">
                {position.tokenA.symbol} / {position.tokenB.symbol}
              </span>
              <span className="inline-block px-8px h-20px leading-20px rounded-100px bg-orange-light text-center text-14px text-orange-normal font-medium">
                {position.fee / 10000}%
              </span>
            </div>
            <div className="flex items-center h-16px mt-4px text-12px font-medium">
              <span className="text-gray-normal">
                Min:&nbsp;
                <span className="text-black-normal">
                  {position.min} {position.tokenA.symbol} per {position.tokenB.symbol}
                </span>
              </span>
              <DoubleArrowIcon className="mx-8px w-16px h-8px" />
              <span className="text-gray-normal">
                Max:&nbsp;
                <span className="text-black-normal">
                  {position.max} {position.tokenA.symbol} per {position.tokenB.symbol}
                </span>
              </span>
            </div>
          </div>

          <div className="inline-flex items-center text-12px font-medium" style={{ color: PositionStatuMap[position.status].color }}>
            {PositionStatuMap[position.status].text}
            {PositionStatuMap[position.status].Icon}
          </div>
        </div>
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

          <Link to="/pool/add_liquidity" className='no-underline'>
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