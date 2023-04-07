import React, { Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Button from '@components/Button';
import Spin from '@components/Spin';
import useI18n from '@hooks/useI18n';
import { usePool } from '@service/pairs&pool';
import { usePositions, PositionStatus, type Position } from '@service/pool-manage';
import { getUnwrapperTokenByAddress } from '@service/tokens';
import { trimDecimalZeros } from '@utils/numberUtils';
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

const PositionItem: React.FC<{ position: Position }> = ({ position }) => {
  const { pool } = usePool({ tokenA: position.token0, tokenB: position.token1, fee: position.fee });
  const unwrapperToken0 = useMemo(() => getUnwrapperTokenByAddress(position.token0.address), [position.token0.address]);
  const unwrapperToken1 = useMemo(() => getUnwrapperTokenByAddress(position.token1.address), [position.token1.address]);

  const priceLowerStr = trimDecimalZeros(position.priceLower.toDecimalMinUnit(5));
  const _priceUpperStr = trimDecimalZeros(position.priceUpper.toDecimalMinUnit(5));
  const priceUpperStr = _priceUpperStr === 'NaN' ? '∞' : _priceUpperStr;
  // console.log(position?.id, position?.fee, unwrapperToken0?.symbol, unwrapperToken1?.symbol, pool?.token0Price?.toDecimalMinUnit(5));
  const status = !pool?.token0Price
    ? undefined
    : (pool.token0Price.lessThan(position.priceUpper) || _priceUpperStr === 'NaN') && (pool.token0Price.greaterThan(position.priceLower) || priceLowerStr === '0')
    ? PositionStatus.InRange
    : PositionStatus.OutOfRange;

  return (
    <div className="mt-6px px-24px h-80px rounded-16px flex justify-between items-center hover:bg-orange-light-hover cursor-pointer transition-colors">
      <div className="inline-block">
        <div className="flex items-center">
          <img className="w-24px h-24px" src={unwrapperToken0?.logoURI} alt={`${unwrapperToken0?.symbol} icon`} />
          <img className="w-24px h-24px -ml-8px" src={unwrapperToken1?.logoURI} alt={`${unwrapperToken1?.symbol} icon`} />
          <span className="mx-4px text-14px text-black-normal font-medium">
            {unwrapperToken0?.symbol} / {unwrapperToken1?.symbol}
          </span>
          <span className="inline-block px-8px h-20px leading-20px rounded-100px bg-orange-light text-center text-14px text-orange-normal font-medium">
            {position.fee / 10000}%
          </span>
        </div>
        <div className="flex items-center h-16px mt-4px text-12px font-medium">
          <span className="text-gray-normal">
            Min:&nbsp;
            <span className="text-black-normal">
              {priceLowerStr} {unwrapperToken0?.symbol} per {unwrapperToken1?.symbol}
            </span>
          </span>
          <DoubleArrowIcon className="mx-8px w-16px h-8px" />
          <span className="text-gray-normal">
            Max:&nbsp;
            <span className="text-black-normal">
              {priceUpperStr} {unwrapperToken0?.symbol} per {unwrapperToken1?.symbol}
            </span>
          </span>
        </div>
      </div>

      {typeof status === 'number' && (
        <div className="inline-flex items-center text-12px font-medium" style={{ color: PositionStatuMap[status].color }}>
          {PositionStatuMap[status].text}
          {PositionStatuMap[status].Icon}
        </div>
      )}
    </div>
  );
};

const PoolContent: React.FC = () => {
  const i18n = useI18n(transitions);
  const positions = usePositions();

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
