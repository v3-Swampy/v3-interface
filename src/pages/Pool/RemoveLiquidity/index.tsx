import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { showModal } from '@components/showPopup';
import 'rc-slider/assets/index.css';

import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import { PositionForUI, usePosition, usePositionFees, removeLiquidity } from '@service/position';
import Settings from '@modules/Settings';
import TokenPair from '@modules/Position/TokenPair';
import Status from '@modules/Position/PositionStatus';
import AmountSlider from './AmountSlider';
import AmountDetail from './AmountDetail';
import ConfirmRemove from './ConfirmRemove';
import Button from '@components/Button';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { trimDecimalZeros } from '@utils/numberUtils';

const transitions = {
  en: {
    remove_liquidity: 'Remove Liquidity',
    preview: 'preview',
  },
  zh: {
    remove_liquidity: 'Remove Liquidity',
    preview: 'preview',
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

  const position: PositionForUI | undefined = usePosition(Number(tokenId));
  const [fee0, fee1] = usePositionFees(Number(tokenId));

  const { leftToken, rightToken, amount0, amount1 } = position || {};
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
      showModal({
        Content: (
          <ConfirmRemove
            onConfirmRemove={() => removeLiquidity({ tokenId, removePercent, positionLiquidity: position?.liquidity })}
            tokenId={tokenId}
            leftRemoveAmount={leftRemoveAmountForUI}
            rightRemoveAmount={rightRemoveAmountForUI}
            leftEarnedFees={leftEarnedFeesForUI}
            rightEarnedFees={rightEarnedFeesForUI}
          />
        ),
        title: i18n.remove_liquidity,
      });
  };

  useEffect(() => {
    if (!leftTotalAmount || !rightTotalAmount) {
      return;
    }
    setLeftRemoveAmount(leftTotalAmount.mul(removePercent).div(100));
    setRightRemoveAmount(rightTotalAmount.mul(removePercent).div(100));
  }, [removePercent, setLeftRemoveAmount, leftTotalAmount, rightTotalAmount]);

  if (!tokenId || !position) return <div />;

  return (
    <PageWrapper className="pt-56px">
      <div className="mx-auto max-w-800px">
        <div className="flex items-center mb-16px gap-8px">
          <span className="i-material-symbols:keyboard-arrow-left text-24px text-gray-normal" />
          <Link to={`/pool/${tokenId}`} className="mr-auto inline-flex items-center no-underline leading-30px text-24px text-orange-normal">
            {i18n.remove_liquidity}
          </Link>
          <Settings />
        </div>
        <BorderBox className="w-full p-16px rounded-28px" variant="gradient-white">
          <div className="flex p-x-16px gap-22px">
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
            className="h-40px w-394px rounded-100px mt-32px mx-auto block"
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
