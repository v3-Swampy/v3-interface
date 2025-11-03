import React, { type ComponentProps } from 'react';
import cx from 'clsx';
import useI18n from '@hooks/useI18n';
import { PositionStatus, type PositionEnhanced, usePositionStatus } from '@service/earn';
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
  [PositionStatus?.InRange]: {
    Icon: <SuccessIcon className="ml-4px w-18px h-18px" />,
    color: '#009595',
    text: 'in_range',
  },
  [PositionStatus?.OutOfRange]: {
    Icon: <WarningIcon className="ml-4px w-18px h-18px" />,
    color: '#FFB75D',
    text: 'out_of_range',
  },
  [PositionStatus?.Closed]: {
    Icon: <ErrorIcon className="ml-4px w-18px h-18px" />,
    color: '#C2C4D0',
    text: 'closed',
  },
} as const;

interface Props extends ComponentProps<'div'> {
  position: PositionEnhanced;
}

const PositionStatusFC: React.FC<Props> = ({ position, className, style, ...props }) => {
  const i18n = useI18n(transitions);
  const status = usePositionStatus(position);
  return (
    <div
      className={cx('inline-flex items-center leading-18px text-12px font-normal', !status && 'opacity-0', className)}
      style={{ color: status ? PositionStatusMap[status]?.color : undefined, ...style }}
      {...props}
    >
      {status ? i18n[PositionStatusMap[status]?.text] : 'loading'}
      {status && PositionStatusMap[status]?.Icon}
    </div>
  );
};

export default PositionStatusFC;
