import React, { useState, useMemo, useCallback, useLayoutEffect } from 'react';
import { type Token } from '@service/tokens';
import cx from 'clsx';
import useI18n from '@hooks/useI18n';
import { usePool, revertPrice } from '@service/pairs&pool';
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

const PriceItem: React.FC<{ tokenA: Token | null; tokenB: Token | null; type: string; price: string }> = ({ tokenA, tokenB, type, price }) => {
  const i18n = useI18n(transitions);

  return (
    <div>
      <div>{type === 'min' ? i18n.minPrice : i18n.maxPrice}</div>
      <div>{price === 'NaN' ? '∞' : price}</div>
      <div>
        {tokenB?.name} {i18n.per} {tokenA?.name}
      </div>
      <div>{i18n.priceDes.replace('$1', tokenA?.name || '')}</div>
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
      setLowerPrice(revertPrice(priceUpperForUI).toDecimalMinUnit(5));
      setUpperPrice(revertPrice(priceLowerForUI).toDecimalMinUnit(5));
    }
  }, [priceLowerForUI, priceUpperForUI, tokenA, rightToken, revertPrice]);
  return (
    <div>
      <div className="flex items-center">
        <div>{i18n.selectedRange}</div>
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
      <div className="flex">
        <PriceItem tokenA={tokenA} tokenB={tokenB} type={'min'} price={lowerPrice} />
        <PriceItem tokenA={tokenA} tokenB={tokenB} type={'max'} price={upperPrice} />
      </div>
      <div>
        <p>{i18n.currentPrice}</p>
        <p>
          {i18n.currentPrice}:&nbsp;&nbsp;<span className="font-medium">{priceTokenA?.toDecimalMinUnit(5) ?? '-'}</span>&nbsp;
        </p>

        <p>
          {tokenB?.name} {i18n.per} {tokenA?.name}
        </p>
      </div>
    </div>
  );
};

export default SelectedRange;
