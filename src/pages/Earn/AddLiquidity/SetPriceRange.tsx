import React, { memo, useState, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import { type UseFormRegister, type UseFormSetValue, type FieldValues, type UseFormGetValues } from 'react-hook-form';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import Input from '@components/Input';
import { usePool, findClosestValidPrice, findNextPreValidPrice, FeeAmount } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import useI18n, { compiled } from '@hooks/useI18n';
import { trimDecimalZeros } from '@utils/numberUtils';
import { useTokenA, useTokenB } from './SelectPair';
import { useCurrentFee } from './SelectFeeTier';
import { ReactComponent as RoundMinusIcon } from '@assets/icons/round_minus.svg';
import { ReactComponent as RoundAddIcon } from '@assets/icons/round_add.svg';

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
    set_starting_price: 'Set Starting Price',
    invalid_range: 'Invalid range selected. The min price must be lower than the max price.',
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
    set_starting_price: '设置一个初始价格',
    invalid_range: '选择的范围无效。最小兑换率必须低于最大兑换率。',
  },
} as const;

const ranges = [1, 5, 10, 20];

const stableCoins = ['USDC', 'USDT', 'AxCNH'];
const majorCoins = ['BTC', 'ETH'];
const getDefaultRange = (tokenA: Token | null | undefined, tokenB: Token | null | undefined) => {
  if (!tokenA || !tokenB) return undefined;
  const isStableA = stableCoins.includes(tokenA.symbol);
  const isStableB = stableCoins.includes(tokenB.symbol);
  const isMajorA = majorCoins.includes(tokenA.symbol);
  const isMajorB = majorCoins.includes(tokenB.symbol);
  
  if (isStableA && isStableB) return 1;
  if ((isStableA || isMajorA) && (isStableB || isMajorB)) return 10;
  return 20;
};

interface Props {
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  getValues: UseFormGetValues<FieldValues>;
  isRangeValid: boolean | null;
  priceInit: string;
  priceLower: string;
  priceUpper: string;
}

const getPriceByRange = ({
  range,
  priceTokenA,
  tokenA,
  tokenB,
  fee,
  type,
}: {
  range: number;
  priceTokenA: Unit | null | undefined;
  tokenA: Token | null | undefined;
  tokenB: Token | null | undefined;
  fee: FeeAmount;
  type: 'lower' | 'upper';
}) => {
  if (!priceTokenA || !tokenA || !tokenB || !fee || Number.isNaN(Number(range)) || range < 0 || range > 100) return '';
  if (range === 100) return type === 'lower' ? '0' : 'Infinity';
  const recommendVal = trimDecimalZeros(
    findClosestValidPrice({
      fee,
      tokenA,
      tokenB,
      searchPrice:
        type === 'lower'
          ? priceTokenA
              .mul(100 - range)
              .div(100)
              .toDecimalMinUnit(5)
          : priceTokenA
              .mul(100 + range)
              .div(100)
              .toDecimalMinUnit(5),
    })?.toDecimalMinUnit(5)
  );

  const priceTokenAFixed5 = priceTokenA?.toDecimalMinUnit(5);
  if (type === 'lower' && priceTokenA && Number(priceTokenAFixed5) > 0.00001 && recommendVal === '0') {
    const half = new Unit(priceTokenAFixed5!).div(2).toDecimalMinUnit(5);
    if (new Unit(half).equals(0)) {
      return '0.00001';
    } else return half;
  }
  return recommendVal;
};

const RangeInput: React.FC<
  Pick<Props, 'register' | 'setValue' | 'getValues' | 'priceLower' | 'priceUpper'> & {
    type: 'lower' | 'upper';
    tokenA: Token | null;
    tokenB: Token | null;
    priceTokenA: Unit | null | undefined;
    fee: FeeAmount;
    defaultRange: number | undefined;
    resetSelectedRange: () => void;
  }
> = ({ type, tokenA, tokenB, priceTokenA, fee, priceLower, priceUpper, register, setValue, getValues, defaultRange, resetSelectedRange }) => {
  const i18n = useI18n(transitions);

  const handleChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>((evt) => {
    if (evt.target.value === '') {
      setValue('amount-tokenB', '');
    }
  }, []);

  const handlePriceChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (evt) => {
      if (!tokenA || !tokenB || !evt.target.value) return;
      try {
        if (evt.target.value === 'Infinity' || evt.target.value === 'NaN' || new Unit(evt.target.value).lessThanOrEqualTo(new Unit(0))) {
          setValue(`price-${type}`, type === 'lower' ? '0' : 'Infinity');
          return;
        }
        setValue(`price-${type}`, findClosestValidPrice({ fee, tokenA, tokenB, searchPrice: evt.target.value }).toDecimalMinUnit(5));
      } catch {
        setValue(`price-${type}`, type === 'lower' ? '0' : 'Infinity');
      } finally {
        resetSelectedRange();
      }
    },
    [fee, tokenA?.address, tokenB?.address, resetSelectedRange]
  );

  const placeholder = useMemo(() => getPriceByRange({ range: defaultRange ?? 20, priceTokenA, tokenA, tokenB, fee, type }), [priceTokenA, tokenA, tokenB, fee, type, defaultRange]);

  const handleClickSub = useCallback(() => {
    if (!tokenA || !tokenB) return;
    const value = getValues();
    const priceStr = value[`price-${type}`];
    if (!priceStr || priceStr === '0' || priceStr === 'Infinity') return;
    const prePrice = findNextPreValidPrice({ direction: 'pre', fee, tokenA, tokenB, searchPrice: priceStr });
    const prePriceString = trimDecimalZeros(prePrice?.toDecimalMinUnit(5));
    setValue(`price-${type}`, type === 'lower' ? prePriceString : prePriceString === '0' ? 'Infinity' : prePriceString);
    resetSelectedRange();
  }, [fee, tokenA?.address, tokenB?.address, resetSelectedRange]);

  const handleClickAdd = useCallback(() => {
    if (!tokenA || !tokenB) return;
    const value = getValues();
    const priceStr = value[`price-${type}`];
    if (!priceStr) {
      setValue(`price-${type}`, placeholder);
      return;
    }
    if (priceStr === '0' || priceStr === 'Infinity') return;
    const nextPrice = findNextPreValidPrice({ direction: 'next', fee, tokenA, tokenB, searchPrice: priceStr });
    setValue(`price-${type}`, trimDecimalZeros(nextPrice?.toDecimalMinUnit(5)));
    resetSelectedRange();
  }, [placeholder, fee, tokenA?.address, tokenB?.address, resetSelectedRange]);

  const shouldHideSubIcon = useMemo(() => {
    if (type === 'lower') {
      return !priceLower || new Unit(priceLower).lessThanOrEqualTo(0);
    } else {
      try {
        return !priceUpper || !new Unit(priceUpper).isFinite();
      } catch (_) {
        return true;
      }
    }
  }, [type, priceLower, priceUpper]);
  const shouldHideAddIcon = useMemo(() => {
    if (type === 'lower') {
      return priceLower && new Unit(priceLower).lessThanOrEqualTo(0);
    } else {
      try {
        return priceUpper && !new Unit(priceUpper).isFinite();
      } catch (_) {
        return true;
      }
    }
  }, [type, priceLower, priceUpper]);

  return (
    <div className={cx('flex-grow-1 flex-shrink-1', !priceTokenA && 'opacity-50 pointer-events-none')}>
      <div className="mb-6px flex justify-between w-full">
        <p className="leading-18px text-14px text-black-normal font-normal">{type === 'lower' ? i18n.min_price : i18n.max_price}</p>

        {!!tokenA && !!tokenB && <span className="leading-20px text-12px text-gray-normal">{`${tokenB.symbol} ${i18n.per} ${tokenA.symbol}`}</span>}
      </div>

      <div className="add-liquidity-price-input relative flex items-center h-40px px-8px rounded-100px border-2px border-solid border-orange-light">
        <div
          className={cx(
            'flex justify-center items-center w-24px h-24px rounded-full bg-orange-light hover:bg-orange-normal text-21px text-white-normal font-normal transition-colors select-none cursor-pointer',
            shouldHideSubIcon && 'opacity-0 pointer-events-none'
          )}
          onClick={handleClickSub}
        >
          <RoundMinusIcon className="w-24px h-24px" />
        </div>
        <Input
          className="mx-8px h-40px text-14px text-black-normal"
          clearIcon
          id={`input--price-${type}`}
          placeholder={placeholder}
          {...register(`price-${type}`, {
            required: true,
            min: 0,
            onBlur: handlePriceChange,
            onChange: handleChange,
          })}
          min={0}
          step={0.00001}
          type={type === 'upper' ? 'string' : 'number'}
        />

        {type === 'upper' && priceUpper === 'Infinity' && (
          <div className="add-liquidity-price-infinity absolute flex justify-center items-center left-36px h-36px w-56px bg-orange-light-hover pointer-events-none">
            <span className="text-24px text-black-normal font-normal">∞</span>
          </div>
        )}
        <div
          className={cx(
            'ml-auto flex justify-center items-center w-24px h-24px rounded-full bg-orange-light hover:bg-orange-normal text-21px text-white-normal font-normal transition-colors select-none cursor-pointer',
            shouldHideAddIcon && 'opacity-0 pointer-events-none'
          )}
          onClick={handleClickAdd}
        >
          <RoundAddIcon className="w-24px h-24px" />
        </div>
      </div>
    </div>
  );
};

const SetPriceRange: React.FC<Props> = ({ priceInit, register, setValue, getValues, isRangeValid, priceUpper, priceLower }) => {
  const i18n = useI18n(transitions);

  const tokenA = useTokenA();
  const tokenB = useTokenB();
  const isBothTokenSelected = !!tokenA && !!tokenB;

  const fee = useCurrentFee();
  const { pool } = usePool({ tokenA, tokenB, fee });
  const priceTokenA = useMemo(
    () => (pool === null ? (priceInit && !Number.isNaN(Number(priceInit)) ? new Unit(priceInit) : null) : pool?.priceOf(tokenA!)),
    [tokenA?.address, pool, priceInit]
  );

  useLayoutEffect(() => {
    setValue('price-init', '');
    if (!pool?.token0Price) {
      setValue('price-lower', '');
      setValue('price-upper', '');
    }
  }, [pool, tokenA?.address, fee]);

  const handlePriceInitChange = useCallback<React.FocusEventHandler<HTMLInputElement>>(
    (evt) => {
      if (!tokenA || !tokenB || !evt.target.value) return;
      setValue('price-init', findClosestValidPrice({ fee, tokenA, tokenB, searchPrice: evt.target.value }).toDecimalMinUnit(5));
    },
    [fee, tokenA, tokenB]
  );

  const [selectedRange, setSelectedRange] = useState<number | 'custom' | 'full' | null>(null);
  const resetSelectedRange = useCallback(() => setSelectedRange(null), []);

  const handleSetFullRange = useCallback(() => {
    setValue('price-lower', '0');
    setValue('price-upper', 'Infinity');
    setSelectedRange('full');
  }, []);

  const handleSetRange = useCallback(
    (range: number) => {
      setValue('price-lower', getPriceByRange({ range: Number(range), priceTokenA, tokenA, tokenB, fee, type: 'lower' }));
      setValue('price-upper', getPriceByRange({ range: Number(range), priceTokenA, tokenA, tokenB, fee, type: 'upper' }));
      setSelectedRange(range);
    },
    [priceTokenA, tokenA, tokenB, fee]
  );

  const handleCustomRangeChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>((evt) => {
    const value = evt.target.value;

    if (value === '') {
      return;
    }

    const numValue = Number(value);

    if (!Number.isNaN(numValue)) {
      if (numValue < 0) {
        evt.target.value = '0';
      } else if (numValue > 100) {
        evt.target.value = '100';
      }
    }
  }, []);

  const handleCustomRangeBlur = useCallback<React.FocusEventHandler<HTMLInputElement>>(
    (evt) => {
      const value = evt.target.value;
      if (value !== '' && !Number.isNaN(Number(value))) {
        handleSetRange(Number(value));
        setSelectedRange('custom');
      }
    },
    [handleSetRange]
  );

  const defaultRange = useMemo(() => getDefaultRange(tokenA, tokenB), [tokenA, tokenB]);
  useEffect(() => {
    if (!priceTokenA || !defaultRange) return;
    handleSetRange(defaultRange);
  }, [defaultRange, priceTokenA]);

  return (
    <div className={cx('p-16px rounded-16px bg-orange-light-hover', !isBothTokenSelected && 'opacity-50 pointer-events-none')}>
      <p className="mb-16px leading-18px text-14px text-black-normal font-normal">{i18n.set_price_range}</p>

      {pool !== null && (
        <p className={cx('text-center text-12px text-black-normal font-light transition-opacity', (!tokenA || !tokenB) && 'opacity-0')}>
          {i18n.current_price}:&nbsp;&nbsp;<span className="font-normal">{priceTokenA?.toDecimalMinUnit(5) ?? '-'}</span>&nbsp;
          {`${tokenB?.symbol} ${i18n.per} ${tokenA?.symbol}`}
        </p>
      )}

      {pool === null && (
        <>
          <div className="mb-12px p-10px rounded-12px bg-orange-light text-12px text-orange-normal">{i18n.create_pool_tip}</div>
          <div className="flex items-center h-36px px-16px rounded-tl-16px rounded-tr-16px border-2px border-solid border-orange-light">
            <Input
              className="h-36px text-14px text-black-normal"
              id="input--price-init"
              {...register('price-init', {
                required: true,
                min: 0,
              })}
              placeholder={i18n.set_starting_price}
              type="number"
              min={0}
              step={0.00001}
              onBlur={handlePriceInitChange}
            />
          </div>
          <div className="flex items-center h-36px px-16px rounded-bl-16px rounded-br-16px bg-orange-light text-14px text-black-normal font-normal">
            {compiled(i18n.current_tokenA_price, { tokenASymbol: tokenA?.symbol ?? '' })}: {priceInit}
          </div>
        </>
      )}

      <div className="mt-10px flex lt-md:flex-wrap gap-16px">
        <RangeInput
          type="lower"
          register={register}
          setValue={setValue}
          getValues={getValues}
          tokenA={tokenA}
          tokenB={tokenB}
          priceTokenA={priceTokenA}
          fee={fee}
          priceLower={priceLower}
          priceUpper={priceUpper}
          defaultRange={defaultRange}
          resetSelectedRange={resetSelectedRange}
        />
        <RangeInput
          type="upper"
          register={register}
          setValue={setValue}
          getValues={getValues}
          tokenA={tokenA}
          tokenB={tokenB}
          priceTokenA={priceTokenA}
          fee={fee}
          priceLower={priceLower}
          priceUpper={priceUpper}
          defaultRange={defaultRange}
          resetSelectedRange={resetSelectedRange}
        />
      </div>

      {isRangeValid === false && <div className="mt-6px text-12px text-error-normal">{i18n.invalid_range}</div>}

      {pool !== null && (
        <div className="mt-16px flex items-center gap-16px select-none">
          <div
            className={cx('flex justify-between items-center px-16px rounded-100px border-2px border-solid border-orange-light text-14px', !priceTokenA && 'pointer-events-none')}
          >
            {ranges.map((range) => (
              <div
                key={range}
                className={cx(
                  'flex justify-center items-center h-40px px-8px font-normal text-gray-normal cursor-pointer',
                  !priceTokenA && 'text-gray-light pointer-events-none',
                  selectedRange === range && 'text-orange-normal'
                )}
                onClick={() => handleSetRange(range)}
              >
                {range}%
              </div>
            ))}
            <div
              className={cx(
                'flex justify-center items-center h-40px px-8px font-normal text-gray-normal cursor-pointer whitespace-nowrap',
                !priceTokenA && 'text-gray-normal pointer-events-none',
                selectedRange === 'full' && 'text-orange-normal'
              )}
              onClick={handleSetFullRange}
            >
              {i18n.full_range}
            </div>
          </div>
          <div className={cx('flex items-center px-16px rounded-100px border-2px border-solid border-orange-light')}>
            <Input
              className={cx('w-56px h-40px text-14px text-gray-normal focus:text-black-normal', selectedRange === 'custom' && 'text-orange-normal')}
              placeholder="Custom"
              max={100}
              min={0}
              step={0.000001}
              type="number"
              onChange={handleCustomRangeChange}
              onBlur={handleCustomRangeBlur}
            />
            <span className="text-14px text-gray-normal">%</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(SetPriceRange);
