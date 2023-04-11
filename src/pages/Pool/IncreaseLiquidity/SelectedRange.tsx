import React, { useState, useMemo, useCallback, useLayoutEffect } from 'react';
import { type Token } from '@service/tokens';
import cx from 'clsx';
import useI18n from '@hooks/useI18n';
import { usePool, invertPrice } from '@service/pairs&pool';
import { PositionForUI } from '@service/pool-manage';

const transitions = {
  en: {
    selectedRange: 'Selected Range',
    minPrice: 'Min Price',
    maxPrice: 'Max Price',
    priceDes: 'Your position will be 100% composed of $1 at this price',
    currentPrice: 'Current Price',
    per: 'per',
  },
  zh: {
    selectedRange: 'Selected Range',
    minPrice: 'Min Price',
    maxPrice: 'Max Price',
    priceDes: 'Your position will be 100% composed of $1 at this price',
    currentPrice: 'Current Price',
    per: 'per',
  },
} as const;

const PriceItem: React.FC<{ tokenA: Token | null; tokenB: Token | null; type: string; price: string; className?: string }> = ({ tokenA, tokenB, type, price, className = '' }) => {
  const i18n = useI18n(transitions);

  return (
    <div className={`border-2 border-solid rounded-10px border-orange-light  text-center p-16px ${className}`}>
      <p className="text-sm leading-18px font-medium">{type === 'min' ? i18n.minPrice : i18n.maxPrice}</p>
      <p className="font-medium text-2xl leading-30px">{price === 'NaN' ? '∞' : price}</p>
      <p className="font-normal text-xs	text-gray-normal my-1px">
        {tokenB?.symbol} {i18n.per} {tokenA?.symbol}
      </p>
      <p className="text-xs font-normal">{i18n.priceDes.replace('$1', tokenA?.symbol || '')}</p>
    </div>
  );
};

const SelectedRange: React.FC<{ detail: PositionForUI }> = ({ detail }) => {
  const i18n = useI18n(transitions);
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const [lowerPrice, setLowerPrice] = useState('');
  const [upperPrice, setUpperPrice] = useState('');

  const { leftToken, rightToken, fee, priceLowerForUI, priceUpperForUI } = detail;

  const { pool } = usePool({ tokenA, tokenB, fee });
  const priceTokenA = useMemo(() => pool?.priceOf(tokenA!), [pool]);

  const handleSwapToken = useCallback((tokenA: React.SetStateAction<Token | null>, tokenB: React.SetStateAction<Token | null>) => {
    setTokenA(tokenA);
    setTokenB(tokenB);
  }, []);

  useLayoutEffect(() => {
    setTokenA(rightToken);
    setTokenB(leftToken);
  }, [rightToken, leftToken]);

  useLayoutEffect(() => {
    if (tokenA?.address === rightToken?.address) {
      setLowerPrice(priceLowerForUI.toDecimalMinUnit(5));
      setUpperPrice(priceUpperForUI.toDecimalMinUnit(5));
    } else {
      setLowerPrice(invertPrice(priceUpperForUI).toDecimalMinUnit(5));
      setUpperPrice(invertPrice(priceLowerForUI).toDecimalMinUnit(5));
    }
  }, [priceLowerForUI, priceUpperForUI, tokenA, rightToken, invertPrice]);
  return (
    <div className="mt-16px">
      <div className="flex items-center justify-between ">
        <div className="px-8px font-medium text-sm">{i18n.selectedRange}</div>
        <div className="ml-4px mr-8px h-28px leading-28px rounded-4px bg-orange-light text-14px font-medium">
          <span
            className={cx('px-10px cursor-pointer', tokenA === leftToken ? 'text-orange-normal pointer-events-none' : 'text-gray-normal')}
            onClick={() => handleSwapToken(leftToken, rightToken)}
          >
            {leftToken?.symbol}
          </span>
          <span
            className={cx('px-10px cursor-pointer', tokenA === rightToken ? 'text-orange-normal pointer-events-none' : 'text-gray-normal')}
            onClick={() => handleSwapToken(rightToken, leftToken)}
          >
            {rightToken?.symbol}
          </span>
        </div>
      </div>
      <div className="flex mt-8px">
        <PriceItem tokenA={tokenA} tokenB={tokenB} type={'min'} price={lowerPrice} className="mr-16px" />
        <PriceItem tokenA={tokenA} tokenB={tokenB} type={'max'} price={upperPrice} />
      </div>
      <div className="border-2 border-solid rounded-10px border-orange-light text-center mt-16px font-medium py-12px">
        <p className="text-sm	leading-18px">{i18n.currentPrice}</p>
        <p className="text-2xl leading-30px">{priceTokenA?.toDecimalMinUnit(5) ?? '-'}</p>
        <p className="font-normal text-gray-normal text-xs">
          {tokenB?.symbol} {i18n.per} {tokenA?.symbol}
        </p>
      </div>
    </div>
  );
};

export default SelectedRange;
