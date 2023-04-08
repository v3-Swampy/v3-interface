import React, { Suspense, useMemo } from 'react';
import useI18n from '@hooks/useI18n';
import { PositionStatus, type PositionForUI } from '@service/pool-manage';
import { usePool } from '@service/pairs&pool';
import { ReactComponent as SuccessIcon } from '@assets/icons/pool_success.svg';
import { ReactComponent as WarningIcon } from '@assets/icons/pool_warning.svg';
import { ReactComponent as ErrorIcon } from '@assets/icons/pool_error.svg';

const transitions = {
  en: {
    in_range: 'In Range',
    out_of_range: 'Out of Range',
    closed: 'Closed',
  },
  zh: {
    in_range: '范围内',
    out_of_range: '超范围',
    closed: '已关闭',
  },
} as const;

const PositionStatusMap = {
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

const Status: React.FC<{ position: PositionForUI }> = ({ position }) => {
  const i18n = useI18n(transitions);

  const { token0, token1, fee, liquidity, tickLower, tickUpper } = position;

  const { pool } = usePool({ tokenA: token0, tokenB: token1, fee: fee });

  const tickCurrent = pool?.tickCurrent;

  const status =
    liquidity === '0' ? PositionStatus.Closed : !tickCurrent ? undefined : tickCurrent < tickLower || tickCurrent >= tickUpper ? PositionStatus.OutOfRange : PositionStatus.InRange;

  return (
    <>
      {typeof status === 'number' && (
        <div className="inline-flex items-center text-12px font-medium" style={{ color: PositionStatusMap[status].color }}>
          {i18n[PositionStatusMap[status].text]}
          {PositionStatusMap[status].Icon}
        </div>
      )}
    </>
  );
};

export default Status;
