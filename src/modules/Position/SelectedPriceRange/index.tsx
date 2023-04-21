/**
 * display the price range in liquidity detail and increase liquidity page
 * when click the inverted button invert the token pair
 */
import React from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import cx from 'clsx';
import { trimDecimalZeros } from '@utils/numberUtils';
import useI18n, { compiled } from '@hooks/useI18n';
import { type PositionForUI } from '@service/position';
import { invertPrice, usePool } from '@service/pairs&pool';
import { type Token, isTokenEqual } from '@service/tokens';
import { ReactComponent as ExchangeIcon } from '@assets/icons/detail_exchange.svg';
import { useInvertedState } from '../invertedState';

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

const PriceItem: React.FC<{ price: Unit | null | undefined; tokenA: Token | null | undefined; tokenB: Token | null | undefined; type: PriceType }> = ({
  price,
  tokenA,
  tokenB,
  type,
}) => {
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

const SelectedPriceRange: React.FC<{
  position: PositionForUI | undefined;
  tokenId: number | string | undefined;
  showInvertButton?: boolean;
  leftToken?: Token;
  rightToken?: Token;
  priceInit?: string;
}> = ({ position, tokenId, showInvertButton = true, leftToken, rightToken, priceInit }) => {
  const i18n = useI18n(transitions);

  const { token0, token1, fee, priceLower, priceUpper } = position ?? {};
  const { pool } = usePool({ tokenA: token0, tokenB: token1, fee });

  const fromPreview = !!leftToken && !!rightToken;
  const [inverted, setInverted] = useInvertedState(tokenId);

  const leftTokenForUI = fromPreview ? leftToken : !inverted ? position?.leftToken : position?.rightToken;
  const rightTokenForUI = fromPreview ? rightToken : !inverted ? position?.rightToken : position?.leftToken;
  const isLeftTokenEqualToken0 = isTokenEqual(leftTokenForUI, token0);

  if (!position) return null;
  return (
    <div className="flex flex-col text-black-normal text-14px leading-18px">
      <div className="flex items-center justify-between mb-8px font-medium">
        <span>{i18n.selected_range}</span>
        {showInvertButton && position?.leftToken && position?.rightToken && (
          <div
            className="flex h-28px box-centent border-2px border-solid border-orange-light rounded-4px bg-orange-light text-14px font-medium cursor-pointer"
            onClick={() => setInverted((pre) => !pre)}
          >
            <span className={cx('px-8px rounded-4px h-24px flex items-center', !inverted ? 'text-orange-normal bg-orange-light-hover' : 'text-gray-normal bg-transparent')}>
              {position?.leftToken?.symbol}
            </span>
            <span className={cx('px-8px rounded-4px h-24px flex items-center', inverted ? 'text-orange-normal bg-orange-light-hover' : 'text-gray-normal bg-transparent')}>
              {position?.rightToken?.symbol}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-stretch mb-16px">
        <PriceItem type={PriceType.Min} price={isLeftTokenEqualToken0 ? priceLower : invertPrice(priceUpper)} tokenA={rightTokenForUI} tokenB={leftTokenForUI} />
        <div className="flex items-center">
          <ExchangeIcon className="w-24px h-24px text-gray-normal mx-8px" />
        </div>
        <PriceItem type={PriceType.Max} price={isLeftTokenEqualToken0 ? priceUpper : invertPrice(priceLower)} tokenA={rightTokenForUI} tokenB={leftTokenForUI} />
      </div>
      <div className="flex flex-col border-2px border-orange-light border-solid rounded-10px p-12px items-center w-full text-14px leading-18px text-black-normal">
        <p className="font-medium">{i18n.current_price}</p>
        {leftTokenForUI && rightTokenForUI && (
          <p className="text-24px leading-30px font-medium">
            {trimDecimalZeros(
              fromPreview && !!priceInit ? priceInit : pool?.priceOf(fromPreview ? leftTokenForUI : inverted ? position?.rightToken! : position?.leftToken!)?.toDecimalMinUnit(5)!
            ) ?? '-'}
          </p>
        )}
        <p className="text-gray-normal text-12px leading-15px text-center font-normal">{`${rightTokenForUI?.symbol} ${i18n.per} ${leftTokenForUI?.symbol}`}</p>
      </div>
    </div>
  );
};

export default SelectedPriceRange;
