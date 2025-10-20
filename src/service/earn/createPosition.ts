import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { NavigateFunction } from 'react-router-dom';
import { uniqueId } from 'lodash-es';
import Decimal from 'decimal.js';
import { NonfungiblePositionManager } from '@contracts/index';
import { getWrapperTokenByAddress } from '@service/tokens';
import { getAccount, sendTransaction } from '@service/account';
import { FeeAmount, getPool } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import { getDeadline, getSlippageTolerance, calcAmountMinWithSlippage, getExpertModeState } from '@service/settings';
import { getMinTick, getMaxTick, calcTickFromPrice, findClosestValidTick } from '@service/pairs&pool';
import { addRecordToHistory } from '@service/history';
import { setInvertedState } from '@modules/Position/invertedState';
import showLiquidityPreviewModal from '@pages/Pool/LiquidityPreviewModal';
import { hidePopup } from '@components/showPopup';
import showGasLimitModal from '@modules/ConfirmTransactionModal/showGasLimitModal';
import { createPreviewPositionForUI } from './positions';

const Q192 = new Decimal(2).toPower(192);
const Zero = new Unit(0);

export const handleClickSubmitCreatePosition = async ({
  fee: _fee,
  'amount-tokenA': _amountTokenA,
  'amount-tokenB': _amountTokenB,
  'price-lower': _priceLower,
  'price-upper': _priceUpper,
  tokenA: _tokenA,
  tokenB: _tokenB,
  priceInit: _priceInit,
  navigate,
}: {
  fee: FeeAmount;
  'amount-tokenA': string;
  'amount-tokenB': string;
  'price-lower': string;
  'price-upper': string;
  tokenA: Token;
  tokenB: Token;
  priceInit?: string;
  navigate: NavigateFunction;
}) => {
  try {
    const account = getAccount();
    if (!account) return;
    const fee = Number(_fee) as FeeAmount;
    const slippageTolerance = getSlippageTolerance() || 0;
    const pool = await getPool({ tokenA: _tokenA, tokenB: _tokenB, fee });
    const tokenA = getWrapperTokenByAddress(_tokenA.address)!;
    const tokenB = getWrapperTokenByAddress(_tokenB.address)!;

    const notNeedSwap = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase();
    const [token0, token1] = notNeedSwap ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks
    const priceInit = !_priceInit ? undefined : notNeedSwap ? new Decimal(_priceInit) : new Unit(1).div(_priceInit).toDecimal();

    const amountTokenA = !!_amountTokenA ? _amountTokenA : '0';
    const amountTokenB = !!_amountTokenB ? _amountTokenB : '0';
    const [_token0Amount, _token1Amount] = notNeedSwap ? [amountTokenA, amountTokenB] : [amountTokenB, amountTokenA];
    const token0Amount = !!_token0Amount ? _token0Amount : '0';
    const token1Amount = !!_token1Amount ? _token1Amount : '0';

    const isPriceLowerZero = new Unit(_priceLower).equals(Zero);
    const isPriceUpperInfinity = _priceUpper === 'Infinity';
    const [priceLower, priceUpper] = notNeedSwap
      ? [new Unit(_priceLower), new Unit(_priceUpper)]
      : [isPriceUpperInfinity ? new Unit('0') : new Unit(1).div(_priceUpper), isPriceLowerZero ? new Unit('Infinity') : new Unit(1).div(_priceLower)];

    const sqrtPriceX96 = priceInit
      ? Decimal.sqrt(
          new Decimal(priceInit)
            .mul(new Decimal(`1e${token1.decimals}`))
            .div(new Decimal(`1e${token0.decimals}`))
            .mul(Q192)
        ).toFixed(0)
      : pool?.sqrtPriceX96 ?? Decimal.sqrt(new Decimal(token1Amount).div(new Decimal(token0Amount)).mul(Q192)).toFixed(0);

    let currentPrice = _priceInit ? _priceInit : pool?.token0Price ? pool.token0Price.toDecimalMinUnit() : new Decimal(token1Amount).div(new Decimal(token0Amount)).toString();
    currentPrice = new Unit(currentPrice).mul(`1e${token1.decimals-token0.decimals}`).toDecimalMinUnit();

    const _tickLower = priceLower.equals(Zero) ? getMinTick(fee) : calcTickFromPrice({ price: new Unit(priceLower), tokenA: token0, tokenB: token1 });
    const _tickUpper = !priceUpper.isFinite() ? getMaxTick(fee) : calcTickFromPrice({ price: new Unit(priceUpper), tokenA: token0, tokenB: token1 });
    const tickLower = typeof _tickLower === 'number' ? _tickLower : +findClosestValidTick({ fee, searchTick: _tickLower }).toDecimalMinUnit();
    const tickUpper = typeof _tickUpper === 'number' ? _tickUpper : +findClosestValidTick({ fee, searchTick: _tickUpper }).toDecimalMinUnit();

    const token0AmountUnit = Unit.fromStandardUnit(token0Amount, token0.decimals);
    const token1AmountUnit = Unit.fromStandardUnit(token1Amount, token1.decimals);

    const { amount0Min, amount1Min } = calcAmountMinWithSlippage(
      sqrtPriceX96,
      slippageTolerance,
      currentPrice,
      tickLower,
      tickUpper,
      token0AmountUnit.toDecimalMinUnit(),
      token1AmountUnit.toDecimalMinUnit()
    );
    const previewUniqueId = uniqueId();
    const inverted = token0?.address === tokenA?.address;
    setInvertedState(previewUniqueId, inverted);

    const data0 = NonfungiblePositionManager.func.interface.encodeFunctionData('createAndInitializePoolIfNecessary', [token0.address, token1.address, +fee, sqrtPriceX96]);
    const data1 = NonfungiblePositionManager.func.interface.encodeFunctionData('mint', [
      {
        token0: token0.address,
        token1: token1.address,
        fee,
        tickLower,
        tickUpper,
        amount0Desired: token0AmountUnit.toHexMinUnit(),
        amount1Desired: token1AmountUnit.toHexMinUnit(),
        amount0Min: new Unit(!_priceInit ? amount0Min : 0).toHexMinUnit(),
        amount1Min: new Unit(!_priceInit ? amount1Min : 0).toHexMinUnit(),
        recipient: account,
        deadline: getDeadline(),
      },
    ]);
    const data2 = NonfungiblePositionManager.func.interface.encodeFunctionData('refundETH');

    const hasWCFX = token0.symbol === 'WCFX' || token1.symbol === 'WCFX';

    const transactionParams = {
      value: hasWCFX ? Unit.fromStandardUnit(token0.symbol === 'WCFX' ? token0Amount : token1Amount, 18).toHexMinUnit() : '0x0',
      data: NonfungiblePositionManager.func.interface.encodeFunctionData('multicall', [hasWCFX ? [data0, data1, data2] : [data0, data1]]),
      to: NonfungiblePositionManager.address,
    };

    const recordParams = {
      type: 'Position_AddLiquidity',
      tokenA_Address: tokenA.address,
      tokenA_Value: amountTokenA,
      tokenB_Address: tokenB.address,
      tokenB_Value: amountTokenB,
    } as const;

    const isInExpertMode = getExpertModeState();

    if (!isInExpertMode) {
      showLiquidityPreviewModal({
        leftToken: _tokenB,
        rightToken: _tokenA,
        leftAmount: Unit.fromStandardUnit(amountTokenB, tokenB.decimals),
        rightAmount: Unit.fromStandardUnit(amountTokenA, tokenA.decimals),
        inverted,
        priceInit: _priceInit,
        previewUniqueId,
        previewPosition: createPreviewPositionForUI({ token0, token1, fee, tickLower, tickUpper, priceLower, priceUpper }, pool),
        transactionParams,
        recordParams,
      });
    } else {
      try {
        const txHash = await sendTransaction(transactionParams);
        addRecordToHistory({ txHash, ...recordParams });
        navigate('/pool');
      } catch (err: any) {
        if (err?.code === -32603) {
          hidePopup();
          setTimeout(() => {
            showGasLimitModal();
          }, 400);
        }
      }
    }
  } catch (err) {
    console.error('Submit create position failed:', err);
  }
};

export const handleCreatePosition = async (transactionParams: { to: string; data: string; value: string }) => {
  const txHash = await sendTransaction(transactionParams);
  return txHash;
};
