import React, { useEffect, useState, useMemo } from 'react';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { Link, useParams, Navigate } from 'react-router-dom';
import 'rc-slider/assets/index.css';

import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import { PositionForUI, PositionStatus, usePosition, usePositionFees, handleSubmitRemoveLiquidity, usePositionStatus } from '@service/position';
import Settings from '@modules/Settings';
import TokenPair from '@modules/Position/TokenPair';
import Status from '@modules/Position/PositionStatus';
import Button from '@components/Button';
import { trimDecimalZeros } from '@utils/numberUtils';
import { ReactComponent as ArrowLeftIcon } from '@assets/icons/arrow_left.svg';
import AmountSlider from './AmountSlider';
import AmountDetail from './AmountDetail';

const transitions = {
  en: {
    remove_liquidity: 'Remove Liquidity',
    preview: 'Preview',
  },
  zh: {
    remove_liquidity: 'Remove Liquidity',
    preview: '预览',
  },
} as const;

const getInvertDirection = (position: PositionForUI | undefined) => {
  if (position) {
    const { amount0, amount1, token0, token1, leftToken, rightToken } = position || {};
    if (amount0 && amount1 && leftToken && rightToken) {
      if (leftToken.address === token0.address || rightToken.address === token1.address) {
        return 'left';
      } else if (leftToken.address === token1.address || rightToken.address === token0.address) {
        return 'right';
      }
    }
  }
  return '';
};

const useFormatAmountForUI = (amount: Unit, decimal: number | undefined) => {
  return useMemo(() => {
    if (decimal !== undefined) {
      const _amount = amount.toDecimalStandardUnit(decimal, decimal);
      if (new Unit(_amount).lessThan(0.00001) && new Unit(_amount).greaterThan(0)) {
        return '< 0.00001';
      }

      return trimDecimalZeros(_amount);
    }

    return '0';
  }, [amount, decimal]);
};

const RemoveLiquidity: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const [removePercent, setRemovePercent] = useState<number>(0);
  const [leftRemoveAmount, setLeftRemoveAmount] = useState<Unit>(new Unit(0));
  const [rightRemoveAmount, setRightRemoveAmount] = useState<Unit>(new Unit(0));

  const position = usePosition(Number(tokenId));
  const status = usePositionStatus(position as PositionForUI);
  const { leftToken, rightToken, amount0, amount1, token0, token1 } = position || {};

  const [fee0, fee1] = usePositionFees(Number(tokenId));

  const invertDirection = useMemo(() => getInvertDirection(position), [position]);

  const [leftTotalAmount, rightTotalAmount, leftEarnedFees, rightEarnedFees] = useMemo(() => {
    let leftTotalAmount = new Unit(0);
    let rightTotalAmount = new Unit(0);
    let leftEarnedFees = new Unit(0);
    let rightEarnedFees = new Unit(0);

    if (amount0 && amount1) {
      if (invertDirection === 'left') {
        leftTotalAmount = amount0;
        rightTotalAmount = amount1;
        leftEarnedFees = new Unit(fee0 || 0);
        rightEarnedFees = new Unit(fee1 || 0);
      } else if (invertDirection === 'right') {
        leftTotalAmount = amount1;
        rightTotalAmount = amount0;
        leftEarnedFees = new Unit(fee1 || 0);
        rightEarnedFees = new Unit(fee0 || 0);
      }
    }
    return [leftTotalAmount, rightTotalAmount, leftEarnedFees, rightEarnedFees];
  }, [invertDirection, amount0, amount1, fee0, fee1]);

  const leftRemoveAmountForUI = useFormatAmountForUI(leftRemoveAmount, leftToken?.decimals);

  const rightRemoveAmountForUI = useFormatAmountForUI(rightRemoveAmount, rightToken?.decimals);

  const leftEarnedFeesForUI = useFormatAmountForUI(leftEarnedFees, leftToken?.decimals);

  const rightEarnedFeesForUI = useFormatAmountForUI(rightEarnedFees, rightToken?.decimals);

  const onClickPreview = () => {
    position &&
      tokenId &&
      handleSubmitRemoveLiquidity({
        tokenId,
        removePercent,
        leftRemoveAmount: leftRemoveAmountForUI,
        rightRemoveAmount: rightRemoveAmountForUI,
        leftEarnedFees: leftEarnedFeesForUI,
        rightEarnedFees: rightEarnedFeesForUI,
      });
  };

  useEffect(() => {
    if (!leftTotalAmount || !rightTotalAmount) {
      return;
    }
    setLeftRemoveAmount(leftTotalAmount.mul(removePercent).div(100));
    setRightRemoveAmount(rightTotalAmount.mul(removePercent).div(100));
  }, [removePercent, setLeftRemoveAmount, leftTotalAmount, rightTotalAmount]);

  if (!tokenId || !position || !status) return null;
  if (status === PositionStatus.Closed) return <Navigate to="/pool" replace />;
  
  return (
    <PageWrapper className="pt-56px lt-mobile:pt-4px pb-40px">
      <div className="mx-auto max-w-800px">
        <div className="mb-16px lt-mobile:mb-12px flex items-center h-40px pl-8px pr-16px text-24px lt-mobile:text-18px text-orange-normal font-normal whitespace-nowrap">
          <Link to={`/pool/${tokenId}`} className="mr-auto inline-flex items-center no-underline text-orange-normal">
            <ArrowLeftIcon className="w-8px h-12px mr-16px lt-mobile:mr-12px" />
            {i18n.remove_liquidity}
          </Link>
          <Settings />
        </div>
        <BorderBox className="w-full p-16px pt-24px rounded-28px" variant="gradient-white">
          <div className="flex md:px-16px mobile:gap-22px lt-mobile:w-full lt-mobile:justify-between">
            <TokenPair position={position!} />
            <Status position={position!} />
          </div>
          <AmountSlider removePercent={removePercent} setRemovePercent={setRemovePercent} />
          <AmountDetail
            leftRemoveAmount={leftRemoveAmountForUI}
            rightRemoveAmount={rightRemoveAmountForUI}
            tokenId={tokenId}
            leftEarnedFees={leftEarnedFeesForUI}
            rightEarnedFees={rightEarnedFeesForUI}
          />
          <Button
            onClick={onClickPreview}
            disabled={!removePercent}
            type="button"
            className="h-40px text-18px max-w-394px w-full rounded-100px mt-32px mx-auto flex"
            color={removePercent ? 'gradient' : 'orange'}
          >
            {i18n.preview}
          </Button>
        </BorderBox>
      </div>
    </PageWrapper>
  );
};

export default RemoveLiquidity;
