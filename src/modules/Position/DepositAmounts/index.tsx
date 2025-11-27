import React, { memo, useRef, useMemo, useLayoutEffect } from 'react';
import { type UseFormRegister, type UseFormSetValue, type UseFormGetValues, type FieldValues } from 'react-hook-form';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import Input, { defaultDynamicFontSize } from '@components/Input';
import Button from '@components/Button';
import Balance from '@modules/Balance';
import { isTokenEqual, type Token } from '@service/tokens';
import { useAccount } from '@service/account';
import { usePool, FeeAmount, invertPrice, getMaxTick, getMinTick, calcPriceFromTick, calcTickFromPrice } from '@service/pairs&pool';
import useI18n from '@hooks/useI18n';
import { trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as LockIcon } from '@assets/icons/lock.svg';
import { TickMath } from '@uniswap/v3-sdk';

const transitions = {
  en: {
    deposit_amounts: 'Deposit Amounts',
    balance: 'Balance',
    max: 'Max',
    outof_range: 'The market price is outside your specified price range. Single-asset deposit only.',
    outof_range_tip: 'Your position will not earn fees or be used in trades until the market price moves into your range.',
  },
  zh: {
    deposit_amounts: '存入金额',
    balance: '余额',
    max: '最大值',
    outof_range: '市场兑换率超出您指定的范围。将只注入单项代币。',
    outof_range_tip: '您的仓位在市场兑换率变化进入到您设置的范围内之前不会赚取手续费或被用于进行兑换交易。',
  },
} as const;

// Exact Uniswap V3 math using native BigInt
const Q96 = 1n << 96n;
const Q192 = 1n << 192n;

/** integer mulDiv floor(a * b / d) using BigInt */
function mulDiv(a: bigint, b: bigint, d: bigint): bigint {
  return (a * b) / d;
}

/** getLiquidityForAmount0(sqrtLeft, sqrtRight, amount0)
 * Solidity formula:
 *  intermediate = sqrtLeft * sqrtRight / Q96
 *  liquidity = amount0 * intermediate / (sqrtRight - sqrtLeft)
 */
function getLiquidityForAmount0(sqrtLeft: bigint, sqrtRight: bigint, amount0: bigint): bigint {
  if (sqrtLeft > sqrtRight) {
    const tmp = sqrtLeft;
    sqrtLeft = sqrtRight;
    sqrtRight = tmp;
  }
  const intermediate = mulDiv(sqrtLeft, sqrtRight, Q96);
  return mulDiv(amount0, intermediate, sqrtRight - sqrtLeft);
}

/** getLiquidityForAmount1(sqrtLeft, sqrtRight, amount1)
 * liquidity = amount1 * Q96 / (sqrtRight - sqrtLeft)
 */
function getLiquidityForAmount1(sqrtLeft: bigint, sqrtRight: bigint, amount1: bigint): bigint {
  if (sqrtLeft > sqrtRight) {
    const tmp = sqrtLeft;
    sqrtLeft = sqrtRight;
    sqrtRight = tmp;
  }
  return mulDiv(amount1 * Q96, 1n, sqrtRight - sqrtLeft);
}

/** getAmount1ForLiquidity(sqrtLeft, sqrtRight, liquidity)
 * amount1 = liquidity * (sqrtRight - sqrtLeft) / Q96
 */
function getAmount1ForLiquidity(sqrtLeft: bigint, sqrtRight: bigint, liquidity: bigint): bigint {
  if (sqrtLeft > sqrtRight) {
    const tmp = sqrtLeft;
    sqrtLeft = sqrtRight;
    sqrtRight = tmp;
  }
  return mulDiv(liquidity, sqrtRight - sqrtLeft, Q96);
}

/** getAmount0ForLiquidity(sqrtLeft, sqrtRight, liquidity)
 * Solidity implementation:
 *  amount0 = (liquidity << 96) * (sqrtRight - sqrtLeft) / sqrtRight / sqrtLeft
 * We compute safely as:
 *  left = mulDiv(liquidity << 96, (sqrtRight - sqrtLeft), sqrtRight)
 *  amount0 = left / sqrtLeft   (integer division)
 */
function getAmount0ForLiquidity(sqrtLeft: bigint, sqrtRight: bigint, liquidity: bigint): bigint {
  if (sqrtLeft > sqrtRight) {
    const tmp = sqrtLeft;
    sqrtLeft = sqrtRight;
    sqrtRight = tmp;
  }
  const left = mulDiv(liquidity << 96n, sqrtRight - sqrtLeft, sqrtRight);
  return left / sqrtLeft;
}

/**
 * Compute counter token amount.
 * - sqrtP: current pool slot0.sqrtPriceX96 (bigint)
 * - sqrtA: TickMath.getSqrtRatioAtTick(tickLower) (bigint)
 * - sqrtB: TickMath.getSqrtRatioAtTick(tickUpper) (bigint)
 * - amount: the provided token amount in raw units (bigint)
 * - isAmountToken0: true if `amount` is token0 amount, false if token1 amount
 *
 * Returns:
 *  { ok: boolean, amountOther?: string (decimal string of integer raw units), reason?: string, note?:string }
 */
function computeCounterTokenAmountRaw(params: { sqrtP: bigint; sqrtA: bigint; sqrtB: bigint; amount: bigint; isAmountToken0: boolean }): {
  ok: boolean;
  amountOther?: string;
  reason?: string;
  note?: string;
} {
  let { sqrtP, sqrtA, sqrtB, amount, isAmountToken0 } = params;

  // normalize sqrtA <= sqrtB for helpers
  if (sqrtA > sqrtB) {
    const tmp = sqrtA;
    sqrtA = sqrtB;
    sqrtB = tmp;
  }

  // Case: price at or below lower tick (price <= lower)
  if (sqrtP <= sqrtA) {
    if (isAmountToken0) {
      // token0 is the active side; token1 requirement is 0 (token0 can be used)
      return { ok: true, amountOther: '0', note: 'price <= lower tick: token1 requirement is 0' };
    } else {
      // user provided token1 but price <= lower -> token1 cannot be used to provide liquidity
      return { ok: false, reason: 'price <= lower tick: provided token1 cannot directly provide liquidity in this range (swap needed)' };
    }
  }

  // Case: price at or above upper tick (price >= upper)
  if (sqrtP >= sqrtB) {
    if (!isAmountToken0) {
      // token1 is the active side; token0 requirement is 0
      return { ok: true, amountOther: '0', note: 'price >= upper tick: token0 requirement is 0' };
    } else {
      // user provided token0 but price >= upper -> token0 cannot be used to provide liquidity
      return { ok: false, reason: 'price >= upper tick: provided token0 cannot directly provide liquidity in this range (swap needed)' };
    }
  }

  // In-range: sqrtA < sqrtP < sqrtB
  if (isAmountToken0) {
    // Given amount0 -> compute required amount1
    const liquidity0 = getLiquidityForAmount0(sqrtP, sqrtB, amount);
    const amount1Required = getAmount1ForLiquidity(sqrtA, sqrtP, liquidity0);
    return { ok: true, amountOther: amount1Required.toString() };
  } else {
    // Given amount1 -> compute required amount0
    const liquidity1 = getLiquidityForAmount1(sqrtA, sqrtP, amount);
    const amount0Required = getAmount0ForLiquidity(sqrtP, sqrtB, liquidity1);
    return { ok: true, amountOther: amount0Required.toString() };
  }
}

interface Props {
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  getValues: UseFormGetValues<FieldValues>;
  /** When creating Position, the lower price may be greater than the upper price.
   * However, when creating and removing, it is definitely true.
   * */
  isRangeValid: boolean | null;
  /**
   * When creating Position, pool may not exist.
   * So there will be a manually entered priceInit value
   */
  priceInit?: string;
  title?: string;
  priceLower: Unit | string | undefined;
  priceUpper: Unit | string | undefined;
  tokenA: Token | null | undefined;
  tokenB: Token | null | undefined;
  fee: FeeAmount | undefined;
}

const DepositAmount: React.FC<
  Pick<Props, 'register' | 'setValue' | 'isRangeValid' | 'fee' | 'getValues'> & {
    token: Token | null | undefined;
    pairToken: Token | null | undefined;
    type: 'tokenA' | 'tokenB';
    priceTokenA: Unit | null | undefined;
    priceLower: Unit | undefined;
    priceUpper: Unit | undefined;
    isValidToInput: boolean;
    isOutOfRange: boolean;
    isPairTokenOutOfRange: boolean;
  }
> = ({ type, token, pairToken, priceTokenA, isRangeValid = true, isOutOfRange, isPairTokenOutOfRange, priceLower, priceUpper, fee, getValues, register, setValue }) => {
  const i18n = useI18n(transitions);
  const account = useAccount();
  const pairKey = `amount-${type === 'tokenA' ? 'tokenB' : 'tokenA'}`;

  const changePairAmount = useRef<(newAmount: string) => void>(() => {});
  useLayoutEffect(() => {
    changePairAmount.current = (newAmount: string) => {
      if (!priceTokenA || !priceLower || !priceUpper || !token || !pairToken || !fee) return;
      if (!newAmount || isPairTokenOutOfRange || !pairToken || !token || !pairToken) {
        setValue(pairKey, '');
        return;
      }
      const usedPriceLower = priceLower.equals(0) ? calcPriceFromTick({ fee, tokenA: token, tokenB: pairToken, tick: getMinTick(fee), convertLimit: false }) : priceLower;
      const usedPriceUpper = !priceUpper.isFinite() ? calcPriceFromTick({ fee, tokenA: token, tokenB: pairToken, tick: getMaxTick(fee), convertLimit: false }) : priceUpper;
      // const usedPriceLower = calcPriceFromTick({ fee, tokenA: token, tokenB: pairToken, tick: -6600, convertLimit: false });
      // const usedPriceUpper = calcPriceFromTick({ fee, tokenA: token, tokenB: pairToken, tick: 60, convertLimit: false });
      // console.log(usedPriceLower?.toDecimalMinUnit(), usedPriceUpper?.toDecimalMinUnit())
      // 计算 tick 值
      const tickLower = calcTickFromPrice({ price: usedPriceLower, tokenA: token, tokenB: pairToken });
      const tickUpper = calcTickFromPrice({ price: usedPriceUpper, tokenA: token, tokenB: pairToken });
      const currentTick = calcTickFromPrice({ price: priceTokenA, tokenA: token, tokenB: pairToken });

      // 获取 sqrt price 值并转换为 bigint
      const sqrtP = BigInt(TickMath.getSqrtRatioAtTick(typeof currentTick === 'number' ? currentTick : parseInt(currentTick.toDecimalMinUnit())).toString());
      const sqrtA = BigInt(TickMath.getSqrtRatioAtTick(typeof tickLower === 'number' ? tickLower : parseInt(tickLower.toDecimalMinUnit())).toString());
      const sqrtB = BigInt(TickMath.getSqrtRatioAtTick(typeof tickUpper === 'number' ? tickUpper : parseInt(tickUpper.toDecimalMinUnit())).toString());

      const currentInputAmount = new Unit(newAmount);

      // 将输入金额转换为最小单位的 bigint
      const amount = BigInt(currentInputAmount.mul(new Unit(10).pow(token.decimals)).toDecimalMinUnit(0));

      // 确定当前 token 是否为 token0 (地址较小的为 token0)
      const isCurrentTokenToken0 = token.address.toLowerCase() < pairToken.address.toLowerCase();

      // 使用新的计算函数
      const result = computeCounterTokenAmountRaw({
        sqrtP,
        sqrtA,
        sqrtB,
        amount,
        isAmountToken0: isCurrentTokenToken0,
      });

      if (!result.ok) {
        console.warn('Counter token calculation failed:', result.reason);
        setValue(pairKey, '0');
        return;
      }

      // 将结果转换回标准单位
      const pairTokenExpectedAmount = new Unit(result.amountOther!).div(new Unit(10).pow(pairToken.decimals));

      setValue(pairKey, trimDecimalZeros(pairTokenExpectedAmount.toDecimalMinUnit(pairToken?.decimals)));
    };
  }, [fee, priceTokenA, priceLower, priceUpper, isPairTokenOutOfRange, token?.address, pairToken?.address]);

  const priceTokenAFixed8 = useMemo(() => (priceTokenA ? priceTokenA.toDecimalMinUnit(8) : null), [priceTokenA]);
  const priceLowerAFixed8 = useMemo(() => (priceLower ? priceLower.toDecimalMinUnit(8) : null), [priceLower]);
  const priceUpperAFixed8 = useMemo(() => (priceUpper ? priceUpper.toDecimalMinUnit(8) : null), [priceUpper]);
  useLayoutEffect(() => {
    if (type === 'tokenB') return;
    const value = getValues();
    const amountTokenA = value['amount-tokenA'];
    if (!priceTokenA || !amountTokenA) {
      setValue('amount-tokenB', '');
      return;
    }
    changePairAmount.current(amountTokenA);
  }, [priceTokenAFixed8, priceLowerAFixed8, priceUpperAFixed8]);

  useLayoutEffect(() => {
    const value = getValues();
    const currentAmount = value[`amount-${type}`];
    if (isPairTokenOutOfRange) {
      setValue(pairKey, '');
    } else {
      if (!priceTokenA) return;
      changePairAmount.current(currentAmount);
    }
  }, [isPairTokenOutOfRange]);

  useLayoutEffect(() => {
    setValue(`amount-${type}`, '');
  }, [fee]);

  return (
    <div
      className={cx('mt-4px h-94px rounded-16px bg-orange-light-hover flex-grow-1', !isOutOfRange ? 'pt-8px pl-16px pr-8px' : 'flex flex-col justify-center items-center px-24px')}
    >
      {!isOutOfRange && (
        <>
          <div className="flex justify-between items-center">
            <Input
              className="text-24px pr-32px lt-mobile:text-16px"
              clearIcon
              disabled={!isRangeValid}
              placeholder="0"
              id={`input--${type}-amount`}
              type="number"
              {...register(`amount-${type}`, {
                required: true,
                min: new Unit(1).toDecimalStandardUnit(undefined, token?.decimals),
              })}
              min={new Unit(1).toDecimalStandardUnit(undefined, token?.decimals)}
              step={new Unit(1).toDecimalStandardUnit(undefined, token?.decimals)}
              onBlur={(evt) => changePairAmount.current(evt.target.value)}
              decimals={token?.decimals}
              dynamicFontSize={defaultDynamicFontSize}
              preventMinus
            />

            {token && (
              <div className="flex-shrink-0 ml-14px flex items-center min-w-80px h-40px px-8px rounded-100px bg-orange-light text-14px text-black-normal font-normal">
                {<img className="w-24px h-24px mr-4px" src={token.logoURI} alt={`${token.symbol} logo`} />}
                {token.symbol}
              </div>
            )}
          </div>

          {account && token && (
            <div className="mt-8px ml-auto flex items-center w-fit h-20px text-14px text-gray-normal">
              {i18n.balance}:{' '}
              <Balance className="ml-2px" address={token.address} decimals={token.decimals} id={`${type}-balance`}>
                {(balance) => (
                  <Button
                    className="ml-12px px-8px h-20px rounded-4px text-14px font-normal border-1px! hover:bg-orange-normal hover:text-white-normal!"
                    variant="outlined"
                    color="orange"
                    disabled={!balance || balance === '0'}
                    onClick={() => {
                      setValue(`amount-${type}`, balance);
                      changePairAmount.current(balance ?? '');
                    }}
                    type="button"
                    id={`${type}-max-button`}
                  >
                    {i18n.max}
                  </Button>
                )}
              </Balance>
            </div>
          )}
        </>
      )}

      {isOutOfRange && (
        <>
          <LockIcon className="w-20px h-24px" />
          <p className="mt-4px text-center text-12px text-gray-normal">{i18n.outof_range}</p>
        </>
      )}
    </div>
  );
};

const DepositAmounts: React.FC<Props> = ({
  tokenA,
  tokenB,
  fee,
  title,
  isRangeValid,
  priceInit,
  priceLower: _priceLower,
  priceUpper: _priceUpper,
  setValue,
  getValues,
  register,
}) => {
  const i18n = useI18n(transitions);
  const { pool } = usePool({ tokenA, tokenB, fee });

  const _priceTokenA = useMemo(
    () => (pool === null ? (priceInit && !Number.isNaN(Number(priceInit)) ? new Unit(priceInit) : null) : pool?.priceOf(tokenA!)),
    [tokenA?.address, pool, priceInit]
  );

  const token0 = tokenA && tokenB ? (tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? tokenA : tokenB) : null;
  const token1 = tokenA && tokenB ? (tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? tokenB : tokenA) : null;
  const isTokenAEqualsToken0 = token0 && tokenA ? isTokenEqual(token0, tokenA) : false;
  const firstToken = {
    token: token0,
    pairToken: token1,
    type: (isTokenAEqualsToken0 ? 'tokenA' : 'tokenB') as 'tokenA' | 'tokenB',
  };

  const secondToken = {
    token: token1,
    pairToken: token0,
    type: (isTokenAEqualsToken0 ? 'tokenB' : 'tokenA') as 'tokenA' | 'tokenB',
  };
  const priceTokenA = isTokenAEqualsToken0 ? _priceTokenA : _priceTokenA ? invertPrice(_priceTokenA) : null;

  const priceLower = useMemo(() => {
    try {
      return _priceLower ? new Unit(isTokenAEqualsToken0 ? _priceLower : invertPrice(_priceUpper)) : undefined;
    } catch (_) {
      return undefined;
    }
  }, [_priceLower, _priceUpper, isTokenAEqualsToken0]);
  const priceUpper = useMemo(() => {
    try {
      return _priceUpper ? new Unit(isTokenAEqualsToken0 ? _priceUpper : invertPrice(_priceLower)) : undefined;
    } catch (_) {
      return undefined;
    }
  }, [_priceLower, _priceUpper, isTokenAEqualsToken0]);

  console.log(priceTokenA?.toDecimalMinUnit(), priceLower?.toDecimalMinUnit(), priceUpper?.toDecimalMinUnit());

  const isValidToInput = !!priceTokenA && !!tokenA && !!tokenB && !!isRangeValid;
  const isPriceLowerGreaterThanCurrentPrice = priceTokenA && priceLower && !priceLower.isNaN() ? priceTokenA.lessThanOrEqualTo(priceLower) : false;
  const isPriceUpperLessThanCurrentPrice = priceTokenA && priceUpper && !priceUpper.isNaN() ? priceTokenA.greaterThanOrEqualTo(priceUpper) : false;

  const account = useAccount();
  useLayoutEffect(() => {
    setValue('amount-tokenA', '');
    setValue('amount-tokenB', '');
  }, [tokenA?.address, tokenB?.address, account]);

  return (
    <div className={cx('mt-24px flex-grow-1 flex flex-col', !isValidToInput && 'opacity-50 pointer-events-none')}>
      <p className="mb-8px leading-18px text-14px text-black-normal ml-8px font-normal">{title || i18n.deposit_amounts}</p>
      <DepositAmount
        {...firstToken}
        priceTokenA={priceTokenA}
        priceLower={priceLower}
        priceUpper={priceUpper}
        isValidToInput={isValidToInput}
        isOutOfRange={isPriceUpperLessThanCurrentPrice}
        isPairTokenOutOfRange={isPriceLowerGreaterThanCurrentPrice}
        setValue={setValue}
        register={register}
        getValues={getValues}
        isRangeValid={isRangeValid}
        fee={fee}
      />
      <DepositAmount
        {...secondToken}
        priceTokenA={priceTokenA}
        priceLower={priceLower}
        priceUpper={priceUpper}
        isValidToInput={isValidToInput}
        isOutOfRange={isPriceLowerGreaterThanCurrentPrice}
        isPairTokenOutOfRange={isPriceUpperLessThanCurrentPrice}
        setValue={setValue}
        register={register}
        getValues={getValues}
        isRangeValid={isRangeValid}
        fee={fee}
      />
    </div>
  );
};

export default memo(DepositAmounts);
