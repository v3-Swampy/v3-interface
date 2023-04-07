import React, { type ComponentProps, memo } from 'react';
import cx from 'clsx';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import Tooltip from '@components/Tooltip';
import { type Props as PopperProps } from '@components/Popper';
import Delay from '@components/Delay';
import { useBalance } from '@service/balance';
import { numFormat } from '@utils/numberUtils';
import Spin from '@components/Spin';

const Zero = Unit.fromMinUnit(0);

interface Props extends Omit<ComponentProps<'div'>, 'children'> {
  address: string;
  decimals?: number;
  abbrDecimals?: 2 | 4;
  symbolPrefix?: string;
  symbol?: string;
  showEllipsis?: boolean;
  placement?: PopperProps['placement'];
  children?: (balance?: string) => React.ReactNode;
}

const abbrStr = {
  2: '0.01',
  4: '0.0001',
};

const Balance: React.FC<Props> = ({ className, address, decimals = 18, abbrDecimals = 4, symbolPrefix, symbol, showEllipsis = false, placement, children, ...props }) => {
  const usedPlacement = placement || (abbrDecimals === 4 ? 'top' : 'bottom');
  const balance = useBalance(address);

  if (!balance) {
    return (
      <Delay mode="opacity">
        <div className={cx('inline-flex items-center', className)} {...props}>
          <Spin />
          {children && children(undefined)}
        </div>
      </Delay>
    );
  }

  const decimalStandardUnit = balance.toDecimalStandardUnit(undefined, decimals);
  if (decimalStandardUnit !== '0' && Unit.lessThan(balance, Unit.fromStandardUnit(abbrStr[abbrDecimals], Number(decimals)))) {
    const isGreaterThanZero = balance.greaterThan(Zero);
    return (
      <Tooltip text={`${isGreaterThanZero ? numFormat(decimalStandardUnit) : Zero}${symbol ? ` ${symbol}` : ''}`} placement={usedPlacement} interactive delay={[888, 333]}>
        <div className={cx('inline-flex items-center', className)} {...props}>
          {symbolPrefix ?? ''}＜{abbrStr[abbrDecimals]}
          {symbol ? ` ${symbol}` : ''}
          {children && children(decimalStandardUnit)}
        </div>
      </Tooltip>
    );
  }

  const nought = decimalStandardUnit.split('.')[1];
  const noughtLen = nought ? nought.length : 0;
  return (
    <Tooltip text={`${numFormat(decimalStandardUnit)}${symbol ? ` ${symbol}` : ''}`} placement={usedPlacement} disabled={noughtLen < abbrDecimals} interactive delay={[888, 333]}>
      <div className={cx('inline-flex items-center', className)} {...props}>
        {noughtLen >= abbrDecimals
          ? `${symbolPrefix ?? ''}${numFormat(balance.toDecimalStandardUnit(abbrDecimals, decimals))}${showEllipsis ? '...' : ''}${symbol ? ` ${symbol}` : ''}`
          : `${symbolPrefix ?? ''}${numFormat(balance.toDecimalStandardUnit(undefined, decimals))}${symbol ? ` ${symbol}` : ''}`}
        {children && children(decimalStandardUnit)}
      </div>
    </Tooltip>
  );
};

export default memo(Balance);