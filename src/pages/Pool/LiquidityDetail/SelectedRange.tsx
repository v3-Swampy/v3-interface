import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import { atom } from 'recoil';
import { trimDecimalZeros } from '@utils/numberUtils';
import { getRecoil, setRecoil } from 'recoil-nexus';
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
  const priceStr = _priceStr === 'NaN' ? '∞' : _priceStr;

  return (
    <div className="flex flex-col items-center w-full">
      <span className="font-medium">{type === PriceType.Min ? i18n.min_price : i18n.max_price}</span>
      <span className="text-24px leading-30px">{priceStr}</span>
      <span className="text-gray-normal text-12px leading-15px">{`${tokenA?.symbol} ${i18n.per} ${tokenB?.symbol}`}</span>
      <span className="max-w-172px text-12px leading-15px text-center">
        {compiled(i18n.price_desc, { tokenSymbol: type === PriceType.Min ? tokenA?.symbol ?? '' : tokenB?.symbol ?? '' })}
      </span>
    </div>
  );
};

const invertedState = atom({ key: 'inverted', default: false });
export const getInverted = () => getRecoil(invertedState);
const setInverted = (inverted: boolean) => setRecoil(invertedState, inverted);

const SelectedRange: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const detail: PositionForUI | undefined = useLiquidityDetail(Number(tokenId));
  if (!detail) return <div>loading...</div>;

  const { token0, token1, fee, leftToken, rightToken, priceLowerForUI, priceUpperForUI } = detail;

  const { pool } = usePool({ tokenA: token0, tokenB: token1, fee });

  const inverted = getInverted();

  const handleSwapToken = () => {
    const inverted = getInverted();
    setInverted(!inverted);
  };

  return (
    <div className="flex flex-col text-black-normal text-14px leading-18px">
      <div className="flex items-center justify-between mb-8px">
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
      <div className="flex items-center mb-16px">
        <div className="flex flex-1 border-2px border-orange-light border-solid rounded-10px p-12px">
          <PriceItem
            type={PriceType.Min}
            price={!inverted ? priceLowerForUI : invertPrice(priceUpperForUI)}
            tokenA={!inverted ? leftToken : rightToken}
            tokenB={!inverted ? rightToken : leftToken}
          />
        </div>
        <ExchangeIcon className="w-24px h-24px text-gray-normal mx-8px" />
        <div className="flex flex-1 border-2px border-orange-light border-solid rounded-10px p-12px">
          <PriceItem
            type={PriceType.Max}
            price={!inverted ? priceUpperForUI : invertPrice(priceLowerForUI)}
            tokenA={!inverted ? leftToken : rightToken}
            tokenB={!inverted ? rightToken : leftToken}
          />
        </div>
      </div>
      <div className="flex flex-col border-2px border-orange-light border-solid rounded-10px p-12px items-center w-full text-14px leading-18px text-black-normal">
        <span className="font-medium">{i18n.current_price}</span>
        {leftToken && rightToken && <span className="text-24px leading-30px">{pool?.priceOf(!inverted ? rightToken : leftToken)?.toDecimalMinUnit(5) ?? '-'}</span>}
        <span className="max-w-172px text-12px leading-15px text-center">
          <span className="text-gray-normal text-12px leading-15px">{`${!inverted ? leftToken?.symbol : rightToken?.symbol} ${i18n.per} ${
            !inverted ? rightToken?.symbol : leftToken?.symbol
          }`}</span>
        </span>
      </div>
    </div>
  );
};

export default SelectedRange;
