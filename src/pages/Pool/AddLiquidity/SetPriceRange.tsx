import React, { useCallback, memo } from 'react';
import { type UseFormRegister, type UseFormSetValue, type FieldValues } from 'react-hook-form';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import Input from '@components/Input';
import { usePool } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import useI18n from '@hooks/useI18n';
import { useTokenA, useTokenB } from './SelectPair';
import { useCurrentFee } from './SelectFeeTier';

const transitions = {
  en: {
    set_price_range: 'Set Price Range',
    current_price: 'Current Price',
    min_price: 'Min Price',
    max_price: 'Max Price',
    per: 'per',
    full_range: 'Full Range',
  },
  zh: {
    set_price_range: '设置价格范围',
    current_price: '当前价格',
    min_price: '最小价格',
    max_price: '最大价格',
    per: '每',
    full_range: '全范围',
  },
} as const;

interface Props {
  register: UseFormRegister<FieldValues>;
  lowRange: string;
  upperRange: string;
}

const RangeInput: React.FC<Props & { type: 'lower' | 'upper'; tokenA: Token | null; tokenB: Token | null; price: Unit | null | undefined; }> = ({
  type,
  tokenA,
  tokenB,
  price,
  lowRange,
  upperRange,
  register,
}) => {
  const i18n = useI18n(transitions);

  const handleBlur = useCallback<React.ChangeEventHandler<HTMLInputElement>>((evt) => {
  }, []);

  return (
    <div className="flex-grow-1 flex-shrink-1">
      <div className="mb-6px flex justify-between w-full">
        <p className="leading-18px text-14px text-black-normal font-medium">{type === 'lower' ? i18n.min_price : i18n.max_price}</p>

        {!!tokenA && !!tokenB && <span className="leading-20px text-12px text-gray-normal">{`${tokenA.symbol} ${i18n.per} ${tokenB.symbol}`}</span>}
      </div>

      <div className="flex items-center h-40px px-8px rounded-100px border-2px border-solid border-orange-light">
        <div className="flex justify-center items-center w-24px h-24px rounded-full bg-orange-light hover:bg-orange-normal text-21px text-white-normal font-medium transition-colors cursor-pointer">
          <span className="i-ic:round-minus" />
        </div>
        <Input
          className="mx-8px h-40px text-14px text-black-normal"
          clearIcon
          id={`input--price-${type}`}
          placeholder='0'
          {...register(`price-${type}`, {
            required: true,
            min: 0,
          })}
          // onBlur={handleBlur}
        />
        <div className="ml-auto flex justify-center items-center w-24px h-24px rounded-full bg-orange-light hover:bg-orange-normal text-21px text-white-normal font-medium transition-colors cursor-pointer">
          <span className="i-material-symbols:add-rounded" />
        </div>
      </div>
    </div>
  );
};

const SetPriceRange: React.FC<Props> = (props) => {
  const i18n = useI18n(transitions);
  const tokenA = useTokenA();
  const tokenB = useTokenB();
  const fee = useCurrentFee();
  const pool = usePool({ tokenA, tokenB, fee });
  const price = pool?.tokenAPrice;

  return (
    <div className="p-16px rounded-16px bg-orange-light-hover">
      <p className="mb-16px leading-18px text-14px text-black-normal font-medium">{i18n.set_price_range}</p>

      <p className={cx('mb-10px text-center text-12px text-black-normal font-light transition-opacity', (!tokenA || !tokenB) && 'opacity-0')}>
        {i18n.current_price}:&nbsp;&nbsp;<span className="font-medium">{pool?.tokenAPrice?.toDecimalMinUnit(4) ?? '-'}</span>&nbsp;
        {`${tokenA?.symbol} ${i18n.per} ${tokenB?.symbol}`}
      </p>

      <div className="flex gap-16px">
        <RangeInput type="lower" {...props} tokenA={tokenA} tokenB={tokenB} price={price} />
        <RangeInput type="upper" {...props} tokenA={tokenA} tokenB={tokenB} price={price} />
      </div>

      <div className="mt-16px flex justify-center items-center h-40px px-8px rounded-100px border-2px border-solid border-orange-light text-16px font-medium text-black-normal cursor-pointer">
        {i18n.full_range}
      </div>
    </div>
  );
};

export default memo(SetPriceRange);
