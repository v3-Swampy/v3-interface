import React, { useCallback, memo } from 'react';
import { type UseFormRegister, type UseFormSetValue, type FieldValues } from 'react-hook-form';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import Input from '@components/Input';
import { usePool } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import useI18n, { compiled } from '@hooks/useI18n';
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
    create_pool_tip:
      'This pool must be initialized before you can add liquidity. To initialize, select a starting price for the pool. Then, enter your liquidity price range and deposit amount. Gas fees will be higher than usual due to the initialization transaction.',
    current_tokenA_price: 'Current {tokenASymbol} Price',
  },
  zh: {
    set_price_range: '设置价格范围',
    current_price: '当前价格',
    min_price: '最小价格',
    max_price: '最大价格',
    per: '每',
    full_range: '全范围',
    create_pool_tip:
      '在你增加流动性之前，这个资金池必须被初始化。要初始化，为资金池选择一个起始价格。然后，输入你的流动资金价格范围和存款金额。由于初始化交易，气体费用将比平时高。',
    current_tokenA_price: '当前 {tokenASymbol} 价格',
  },
} as const;

interface Props {
  register: UseFormRegister<FieldValues>;
  lowRange: string;
  upperRange: string;
}

const RangeInput: React.FC<Props & { type: 'lower' | 'upper'; tokenA: Token | null; tokenB: Token | null; price: Unit | null | undefined }> = ({
  type,
  tokenA,
  tokenB,
  price,
  lowRange,
  upperRange,
  register,
}) => {
  const i18n = useI18n(transitions);

  const handleBlur = useCallback<React.ChangeEventHandler<HTMLInputElement>>((evt) => {}, []);

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
          placeholder="0"
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
  const { state, pool } = usePool({ tokenA, tokenB, fee });
  const price = pool?.tokenAPrice;

  return (
    <div className="p-16px rounded-16px bg-orange-light-hover">
      <p className="mb-16px leading-18px text-14px text-black-normal font-medium">{i18n.set_price_range}</p>

      {pool !== null && (
        <p className={cx('text-center text-12px text-black-normal font-light transition-opacity', (!tokenA || !tokenB) && 'opacity-0')}>
          {i18n.current_price}:&nbsp;&nbsp;<span className="font-medium">{pool?.tokenAPrice?.toDecimalMinUnit(4) ?? '-'}</span>&nbsp;
          {`${tokenA?.symbol} ${i18n.per} ${tokenB?.symbol}`}
        </p>
      )}

      {pool === null && (
        <>
          <div className="mb-12px p-10px rounded-12px bg-orange-light text-12px text-orange-normal">{i18n.create_pool_tip}</div>
          <div className="flex items-center h-36px px-16px rounded-tl-16px rounded-tr-16px border-2px border-solid border-orange-light">
            <Input
              className="h-36px text-14px text-black-normal"
              id="input--price-init"
              {...props.register(`price-init`, {
                required: true,
                min: 0,
              })}
            />
          </div>
          <div className="flex items-center h-36px px-16px rounded-bl-16px rounded-br-16px bg-orange-light text-14px text-black-normal font-medium">
            {compiled(i18n.current_tokenA_price, { tokenASymbol: tokenA?.symbol ?? '' })}:
          </div>
        </>
      )}

      <div className="mt-10px flex gap-16px">
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
