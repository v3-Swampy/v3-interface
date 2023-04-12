/**
 * display the price range in liquidity detail and increase liquidity page
 * when click the inverted button invert the token pair
 */
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import { atom, useRecoilState } from 'recoil';
import { trimDecimalZeros } from '@utils/numberUtils';
import useI18n, { compiled } from '@hooks/useI18n';
import { PositionForUI, useLiquidityDetail } from '@service/pool-manage';
import { invertPrice, usePool } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import { ReactComponent as ExchangeIcon } from '@assets/icons/detail_exchange.svg';

const transitions = {
  en: {
    selected_range: 'Selected Range',
    min_price: 'Min Price',
    max_price: 'Max Price',
    per: 'per',
    price_desc: 'Your position will be 100% composed of {tokenSymbol} of this price',
    current_price: 'Current Price',
  },
  zh: {
    selected_range: '已选范围',
    min_price: '最低价格',
    max_price: '最高价格',
    per: '每',
    price_desc: 'Your position will be 100% composed of {tokenSymbol} of this price',
    current_price: '当前价格',
  },
} as const;

enum PriceType {
  Min,
  Max,
}

const PriceItem: React.FC<{ price: Unit | null; tokenA: Token | null; tokenB: Token | null; type: PriceType }> = ({ price, tokenA, tokenB, type }) => {
  const i18n = useI18n(transitions);

  const _priceStr = price ? trimDecimalZeros(price.toDecimalMinUnit(5)) : '-';
  const priceStr = _priceStr === 'Infinity' ? '∞' : _priceStr;

  return (
    <div className="flex flex-1 flex-col items-center border-2px border-orange-light border-solid rounded-10px p-10px">
      <p className="font-medium">{type === PriceType.Min ? i18n.min_price : i18n.max_price}</p>
      <p className="text-24px leading-30px font-medium">{priceStr}</p>
      <p className="text-gray-normal text-12px leading-15px font-normal">{`${tokenA?.symbol} ${i18n.per} ${tokenB?.symbol}`}</p>
      <p className="max-w-172px text-12px leading-15px text-center font-normal">
        {compiled(i18n.price_desc, { tokenSymbol: type === PriceType.Min ? tokenA?.symbol ?? '' : tokenB?.symbol ?? '' })}
      </p>
    </div>
  );
};

export const invertedState = atom({ key: 'inverted', default: false });

const SelectedPriceRange: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const detail: PositionForUI | undefined = useLiquidityDetail(Number(tokenId));
  if (!detail) return <div>loading...</div>;

  const { token0, token1, fee, leftToken, rightToken, priceLowerForUI, priceUpperForUI } = detail;

  const { pool } = usePool({ tokenA: token0, tokenB: token1, fee });

  const [inverted, setInverted] = useRecoilState(invertedState);

  const handleSwapToken = () => {
    setInverted(!inverted);
  };

  return (
    <div className="flex flex-col text-black-normal text-14px leading-18px">
      <div className="flex items-center justify-between mb-8px font-medium">
        <span>{i18n.selected_range}</span>
        {leftToken && rightToken && (
          <div
            className="flex h-28px box-centent border-2px border-solid border-orange-light rounded-4px bg-orange-light text-14px font-medium cursor-pointer"
            onClick={handleSwapToken}
          >
            <span className={cx('px-8px rounded-4px h-24px flex items-center', inverted ? 'text-orange-normal bg-orange-light-hover' : 'text-gray-normal bg-transparent')}>
              {leftToken.symbol}
            </span>
            <span className={cx('px-8px rounded-4px h-24px flex items-center', !inverted ? 'text-orange-normal bg-orange-light-hover' : 'text-gray-normal bg-transparent')}>
              {rightToken.symbol}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-stretch mb-16px">
        <PriceItem
          type={PriceType.Min}
          price={!inverted ? priceLowerForUI : invertPrice(priceUpperForUI)}
          tokenA={!inverted ? leftToken : rightToken}
          tokenB={!inverted ? rightToken : leftToken}
        />
        <div className="flex items-center">
          <ExchangeIcon className="w-24px h-24px text-gray-normal mx-8px" />
        </div>
        <PriceItem
          type={PriceType.Max}
          price={!inverted ? priceUpperForUI : invertPrice(priceLowerForUI)}
          tokenA={!inverted ? leftToken : rightToken}
          tokenB={!inverted ? rightToken : leftToken}
        />
      </div>
      <div className="flex flex-col border-2px border-orange-light border-solid rounded-10px p-12px items-center w-full text-14px leading-18px text-black-normal">
        <p className="font-medium">{i18n.current_price}</p>
        {leftToken && rightToken && <p className="text-24px leading-30px font-medium">{trimDecimalZeros(pool?.priceOf(!inverted ? rightToken : leftToken)?.toDecimalMinUnit(5)!) ?? '-'}</p>}
        <p className="text-gray-normal text-12px leading-15px text-center font-normal">
          {`${!inverted ? leftToken?.symbol : rightToken?.symbol} ${i18n.per} ${!inverted ? rightToken?.symbol : leftToken?.symbol}`}
        </p>
      </div>
    </div>
  );
};

export default SelectedPriceRange;
