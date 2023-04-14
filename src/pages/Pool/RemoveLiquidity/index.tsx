import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { showModal } from '@components/showPopup';
import 'rc-slider/assets/index.css';

import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import { PositionForUI, usePosition, removeLiquidity } from '@service/position';
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

const getTotalAmounts = (position: PositionForUI | undefined) => {
  let leftTotalAmount = new Unit(0);
  let rightTotalAmount = new Unit(0);
  if (position) {
    const { amount0, amount1, token0, token1, leftToken, rightToken } = position || {};

    if (amount0 && amount1 && leftToken && rightToken) {
      if (leftToken.address === token0.address || rightToken.address === token1.address) {
        leftTotalAmount = amount0;
        rightTotalAmount = amount1;
      } else if (leftToken.address === token1.address || rightToken.address === token0.address) {
        leftTotalAmount = amount1;
        rightTotalAmount = amount0;
      }
    }
  }
  return [leftTotalAmount, rightTotalAmount];
};
const RemoveLiquidity: React.FC = () => {
  const i18n = useI18n(transitions);
  const { tokenId } = useParams();
  const [removePercent, setRemovePercent] = useState<number>(0);
  const [leftRemoveAmount, setLeftRemoveAmount] = useState<Unit>(new Unit(0));
  const [rightRemoveAmount, setRightRemoveAmount] = useState<Unit>(new Unit(0));

  const position: PositionForUI | undefined = usePosition(Number(tokenId));
  console.log('position', position);
  const { leftToken, rightToken, amount0, amount1 } = position || {};

  const leftRemoveAmountForUI = useMemo(() => {
    return trimDecimalZeros(leftRemoveAmount.toDecimalStandardUnit(5, leftToken?.decimals));
  }, [leftRemoveAmount, leftToken?.decimals]);

  const rightRemoveAmountForUI = useMemo(() => {
    return trimDecimalZeros(rightRemoveAmount.toDecimalStandardUnit(5, rightToken?.decimals));
  }, [rightRemoveAmount, rightToken?.decimals]);

  const onClickPreview = () => {
    position &&
      tokenId &&
      showModal({
        Content: (
          <ConfirmRemove
            onConfirmRemove={() => {
              removeLiquidity({ tokenId, removePercent, positionLiquidity: position?.liquidity });
            }}
            tokenId={tokenId}
            leftRemoveAmount={leftRemoveAmountForUI}
            rightRemoveAmount={rightRemoveAmountForUI}
          />
        ),
        title: i18n.remove_liquidity,
      });
  };

  useEffect(() => {
    const [leftTotalAmount, rightTotalAmount] = getTotalAmounts(position);
    setLeftRemoveAmount(leftTotalAmount.mul(removePercent).div(100));
    setRightRemoveAmount(rightTotalAmount.mul(removePercent).div(100));
  }, [removePercent, setLeftRemoveAmount, getTotalAmounts, amount0, amount1]);

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
          <AmountDetail leftRemoveAmount={leftRemoveAmountForUI} rightRemoveAmount={rightRemoveAmountForUI} tokenId={tokenId} />
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
