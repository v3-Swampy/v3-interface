import React, { memo, useCallback, useMemo, useLayoutEffect } from 'react';
import { type UseFormRegister, type UseFormSetValue, type FieldValues, type UseFormGetValues } from 'react-hook-form';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import Input from '@components/Input';
import { usePool, findClosestValidPrice, FeeAmount, calcTickFromPrice, calcPriceFromTick } from '@service/pairs&pool';
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

interface Props {
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  getValues: UseFormGetValues<FieldValues>;
  isRangeValid: boolean | null;
  priceInit: string;
  priceLower: string;
  priceUpper: string;
}

const RangeInput: React.FC<
  Pick<Props, 'register' | 'setValue' | 'getValues' | 'priceLower' | 'priceUpper'> & {
    type: 'lower' | 'upper';
    tokenA: Token | null;
    tokenB: Token | null;
    priceTokenA: Unit | null | undefined;
    fee: FeeAmount;
  }
> = ({ type, tokenA, tokenB, priceTokenA, fee, priceLower, priceUpper, register, setValue, getValues }) => {
  const i18n = useI18n(transitions);

  const handlePriceChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
    (evt) => {
      if (!tokenA || !tokenB || !evt.target.value) return;
      try {
        if (evt.target.value === 'Infinity' || evt.target.value === 'NaN' || new Unit(evt.target.value).lessThanOrEqualTo(new Unit(0))) {
          setValue(`price-${type}`, type === 'lower' ? '0' : 'Infinity');
          return;
        }
      } catch {
        setValue(`price-${type}`, type === 'lower' ? '0' : 'Infinity');
        return;
      }
      setValue(`price-${type}`, findClosestValidPrice({ fee, tokenA, tokenB, searchPrice: evt.target.value }).toDecimalMinUnit(5));
    },
    [fee, tokenA?.address, tokenB?.address]
  );

  const placeholder = useMemo(() => (!priceTokenA ? '' : type === 'lower' ? priceTokenA.div(2).toDecimalMinUnit(5) : priceTokenA.mul(2).toDecimalMinUnit(5)), [priceTokenA]);

  const handleClickSub = useCallback(() => {
    if (!tokenA || !tokenB) return;
    const value = getValues();
    const priceStr = value[`price-${type}`];
    if (!priceStr || priceStr === '0' || priceStr === 'Infinity') return;
    const price = new Unit(priceStr);
    const step = fee / 50;
    if (fee - step < 0) return;
    const tick: Unit = calcTickFromPrice({ price, tokenA, tokenB });
    setValue(`price-${type}`, calcPriceFromTick({ tick: Number(tick.toDecimalMinUnit()) - step, tokenA, tokenB, fee }).toDecimalMinUnit(5));
  }, [fee, tokenA?.address, tokenB?.address]);

  const handleClickAdd = useCallback(() => {
    if (!tokenA || !tokenB) return;
    const value = getValues();
    const priceStr = value[`price-${type}`];
    if (!priceStr) {
      setValue(`price-${type}`, placeholder);
      return;
    }
    if (priceStr === '0' || priceStr === 'Infinity') return;
    const price = new Unit(priceStr);
    const step = fee / 50;
    if (fee - step < 0) return;
    const tick: Unit = calcTickFromPrice({ price, tokenA, tokenB });
    setValue(`price-${type}`, calcPriceFromTick({ tick: Number(tick.toDecimalMinUnit()) + step, tokenA, tokenB, fee }).toDecimalMinUnit(5));
  }, [placeholder, fee, tokenA?.address, tokenB?.address]);

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
        <p className="leading-18px text-14px text-black-normal font-medium">{type === 'lower' ? i18n.min_price : i18n.max_price}</p>

        {!!tokenA && !!tokenB && <span className="leading-20px text-12px text-gray-normal">{`${tokenB.symbol} ${i18n.per} ${tokenA.symbol}`}</span>}
      </div>

      <div className="add-liquidity-price-input relative flex items-center h-40px px-8px rounded-100px border-2px border-solid border-orange-light">
        <div
          className={cx(
            'flex justify-center items-center w-24px h-24px rounded-full bg-orange-light hover:bg-orange-normal text-21px text-white-normal font-medium transition-colors cursor-pointer',
            shouldHideSubIcon && 'opacity-0 pointer-events-none'
          )}
          onClick={handleClickSub}
        >
          <span className="i-ic:round-minus" />
        </div>
        <Input
          className="mx-8px h-40px text-14px text-black-normal"
          clearIcon
          id={`input--price-${type}`}
          placeholder={placeholder}
          {...register(`price-${type}`, {
            required: true,
            min: 0,
          })}
          min={0}
          onBlur={handlePriceChange}
          step={0.00001}
          type={type === 'upper' ? 'string' : 'number'}
        />

        {type === 'upper' && priceUpper === 'Infinity' && (
          <div className="add-liquidity-price-infinity absolute flex justify-center items-center left-36px h-36px w-56px bg-orange-light-hover pointer-events-none">
            <span className="i-icomoon-free:infinite text-18px text-black-normal font-medium" />
          </div>
        )}
        <div
          className={cx(
            'ml-auto flex justify-center items-center w-24px h-24px rounded-full bg-orange-light hover:bg-orange-normal text-21px text-white-normal font-medium transition-colors cursor-pointer',
            shouldHideAddIcon && 'opacity-0 pointer-events-none'
          )}
          onClick={handleClickAdd}
        >
          <span className="i-material-symbols:add-rounded" />
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
  const { state, pool } = usePool({ tokenA, tokenB, fee });
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

  const setFullRange = useCallback(() => {
    setValue('price-lower', '0');
    setValue('price-upper', 'Infinity');
  }, []);

  return (
    <div className={cx('p-16px rounded-16px bg-orange-light-hover', !isBothTokenSelected && 'opacity-50 pointer-events-none')}>
      <p className="mb-16px leading-18px text-14px text-black-normal font-medium">{i18n.set_price_range}</p>

      {pool !== null && (
        <p className={cx('text-center text-12px text-black-normal font-light transition-opacity', (!tokenA || !tokenB) && 'opacity-0')}>
          {i18n.current_price}:&nbsp;&nbsp;<span className="font-medium">{priceTokenA?.toDecimalMinUnit(5) ?? '-'}</span>&nbsp;
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
          <div className="flex items-center h-36px px-16px rounded-bl-16px rounded-br-16px bg-orange-light text-14px text-black-normal font-medium">
            {compiled(i18n.current_tokenA_price, { tokenASymbol: tokenA?.symbol ?? '' })}: {priceInit}
          </div>
        </>
      )}

      <div className="mt-10px flex gap-16px">
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
        />
      </div>

      {isRangeValid === false && <div className="mt-6px text-12px text-error-normal">{i18n.invalid_range}</div>}

      {pool !== null && (
        <div
          className={cx(
            'mt-16px flex justify-center items-center h-40px px-8px rounded-100px border-2px border-solid border-orange-light text-16px font-medium text-black-normal cursor-pointer',
            !priceTokenA && 'text-gray-normal pointer-events-none'
          )}
          onClick={setFullRange}
        >
          {i18n.full_range}
        </div>
      )}
    </div>
  );
};

export default memo(SetPriceRange);
