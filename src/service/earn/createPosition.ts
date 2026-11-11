import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { NavigateFunction } from 'react-router-dom';
import { uniqueId } from 'lodash-es';
import Decimal from 'decimal.js';
import { AutoPositionManager } from '@contracts/index';
import { getWrapperTokenByAddress } from '@service/tokens';
import { getAccount, sendTransaction } from '@service/account';
import { FeeAmount, updatePool, resolveTickRange } from '@service/pairs&pool';
import { type Token } from '@service/tokens';
import { getDeadline, getSlippageTolerance, calcAmountMinWithSlippage, getExpertModeState } from '@service/settings';
import { addRecordToHistory } from '@service/history';
import showLiquidityPreviewModal from '@pages/Earn/LiquidityPreviewModal';
import { hidePopup } from '@components/showPopup';
import showGasLimitModal from '@modules/ConfirmTransactionModal/showGasLimitModal';
import { calcAmountsForLiquidity, calcLiquidityForAmounts, priceToSqrtPriceX96 } from '@utils/v3Math';
import { createPreviewPositionForUI } from './positions';

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
    const slippageTolerance = getSlippageTolerance();
    const tokenA = getWrapperTokenByAddress(_tokenA.address)!;
    const tokenB = getWrapperTokenByAddress(_tokenB.address)!;

    const notNeedSwap = tokenA.address.toLocaleLowerCase() < tokenB.address.toLocaleLowerCase();
    const [token0, token1] = notNeedSwap ? [tokenA, tokenB] : [tokenB, tokenA]; // does safety checks

    /**
     * 池子是否已经 initialize 必须以链上实时状态为准，不能用 recoil 里可能过期的池子状态：
     * `mint` 内部的 createAndInitializePoolIfNecessary 只在 sqrtPriceX96 == 0 时才会 initialize，
     * 池子已存在时会静默沿用链上价格。若前端仍按 priceInit 组交易，用户就会用一个自己没见过的价格建仓。
     */
    const pool = await updatePool({ tokenA: _tokenA, tokenB: _tokenB, fee });

    const priceInit = !_priceInit ? undefined : notNeedSwap ? new Decimal(_priceInit) : new Unit(1).div(_priceInit).toDecimal();
    const initialPrice = priceInit?.greaterThan(0) && priceInit.isFinite() ? priceInit : undefined;

    if (!pool?.isInitialized && !initialPrice) {
      console.warn('Create position failed: pool is not initialized and there is no valid initial price');
      return;
    }

    const sqrtPriceX96 = pool?.isInitialized
      ? pool.sqrtPriceX96!
      : priceToSqrtPriceX96({ price: initialPrice!, token0Decimals: token0.decimals, token1Decimals: token1.decimals });

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

    const { tickLower, tickUpper } = resolveTickRange({ priceLower, priceUpper, token0, token1, fee });
    if (tickLower >= tickUpper) {
      console.warn('Create position failed: invalid tick range', { tickLower, tickUpper });
      return;
    }

    const token0AmountUnit = Unit.fromStandardUnit(token0Amount, token0.decimals);
    const token1AmountUnit = Unit.fromStandardUnit(token1Amount, token1.decimals);
    const amount0Desired = BigInt(token0AmountUnit.toHexMinUnit()).toString();
    const amount1Desired = BigInt(token1AmountUnit.toHexMinUnit()).toString();

    const liquidity = calcLiquidityForAmounts({ sqrtPriceX96, tickLower, tickUpper, amount0: amount0Desired, amount1: amount1Desired });
    // 实际会被池子收走的金额（desired 只是上限，区间内按比例只用其中一部分）
    const { amount0, amount1 } = calcAmountsForLiquidity({ sqrtPriceX96, tickLower, tickUpper, liquidity });
    /**
     * 首次建池同样要带上 min：desired 的比例和 priceInit 隐含的比例不一致时，一侧只会被吃掉一部分，
     * min 置 0 就等于完全放弃「实际存入量」的下界。
     */
    const { amount0Min, amount1Min } = calcAmountMinWithSlippage({
      sqrtPriceX96,
      slippage: slippageTolerance,
      tickLower,
      tickUpper,
      amount0: amount0Desired,
      amount1: amount1Desired,
    });
    const previewUniqueId = uniqueId();
    const deadline = getDeadline();

    const data = AutoPositionManager.func.interface.encodeFunctionData('mint', [
      {
        token0: token0.address,
        token1: token1.address,
        fee,
        tickLower,
        tickUpper,
        amount0Desired: token0AmountUnit.toHexMinUnit(),
        amount1Desired: token1AmountUnit.toHexMinUnit(),
        amount0Min: new Unit(amount0Min).toHexMinUnit(),
        amount1Min: new Unit(amount1Min).toHexMinUnit(),
        recipient: account,
        deadline,
      },
      sqrtPriceX96,
    ]);

    const hasWCFX = token0.symbol === 'WCFX' || token1.symbol === 'WCFX';

    // 原生币按用户输入全额发送，合约会把没用到的部分退回来（_refundUnusedTokens）
    const transactionParams = {
      value: hasWCFX ? Unit.fromStandardUnit(token0.symbol === 'WCFX' ? token0Amount : token1Amount, 18).toHexMinUnit() : '0x0',
      data,
      to: AutoPositionManager.address,
    };

    const [amountA, amountB] = notNeedSwap ? [amount0, amount1] : [amount1, amount0];
    const depositedAmountA = new Unit(amountA.toString()).toDecimalStandardUnit(undefined, tokenA.decimals);
    const depositedAmountB = new Unit(amountB.toString()).toDecimalStandardUnit(undefined, tokenB.decimals);

    // 历史记录记实际存入量，而不是用户输入的上限
    const recordParams = {
      type: 'Position_AddLiquidity',
      tokenA_Address: tokenA.address,
      tokenA_Value: depositedAmountA,
      tokenB_Address: tokenB.address,
      tokenB_Value: depositedAmountB,
    } as const;

    const isInExpertMode = getExpertModeState();

    if (!isInExpertMode) {
      showLiquidityPreviewModal({
        leftToken: _tokenA,
        rightToken: _tokenB,
        leftAmount: new Unit(depositedAmountA),
        rightAmount: new Unit(depositedAmountB),
        priceInit: pool?.isInitialized ? undefined : _priceInit,
        previewPosition: createPreviewPositionForUI({ tokenId: Number(previewUniqueId), token0, token1, fee, tickLower, tickUpper, priceLower, priceUpper }, pool),
        transactionParams,
        recordParams,
      });
    } else {
      try {
        const txHash = await sendTransaction(transactionParams);
        addRecordToHistory({ txHash, ...recordParams });
        navigate('/earn/my-positions');
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
