import React, { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { showModal } from '@components/showPopup';
import 'rc-slider/assets/index.css';

import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import useI18n from '@hooks/useI18n';
import { PositionForUI, useLiquidityDetail } from '@service/pool-manage';
import Settings from '@modules/Settings';
import TokenPair from '@modules/TokenPair';
import Status from '@modules/Status';
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

const getTotalAmounts = (detail: PositionForUI | undefined) => {
  let leftTotalAmount = new Unit(0);
  let rightTotalAmount = new Unit(0);
  if (detail) {
    const { amount0, amount1, token0, token1, leftToken, rightToken } = detail;

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

  const detail: PositionForUI | undefined = useLiquidityDetail(Number(tokenId));

  const leftRemoveAmountForUI = useMemo(() => {
    return trimDecimalZeros(leftRemoveAmount.toDecimalStandardUnit(5, detail?.leftToken?.decimals));
  }, [leftRemoveAmount, detail?.leftToken?.decimals]);

  const rightRemoveAmountForUI = useMemo(() => {
    return trimDecimalZeros(rightRemoveAmount.toDecimalStandardUnit(5, detail?.rightToken?.decimals));
  }, [rightRemoveAmount, detail?.rightToken?.decimals]);

  const onClickPreview = () => {
    detail &&
      showModal({ Content: <ConfirmRemove detail={detail} leftRemoveAmount={leftRemoveAmountForUI} rightRemoveAmount={rightRemoveAmountForUI} />, title: i18n.remove_liquidity });
  };

  useEffect(() => {
    const [leftTotalAmount, rightTotalAmount] = getTotalAmounts(detail);
    setLeftRemoveAmount(leftTotalAmount.mul(removePercent).div(100));
    setRightRemoveAmount(rightTotalAmount.mul(removePercent).div(100));
  }, [removePercent, setLeftRemoveAmount, getTotalAmounts, detail?.amount0, detail?.amount1]);

  if (!detail) return <div />;

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
            <TokenPair position={detail} />
            <Status position={detail} />
          </div>
          <AmountSlider detail={detail} removePercent={removePercent} setRemovePercent={setRemovePercent} />
          <AmountDetail detail={detail} leftRemoveAmount={leftRemoveAmountForUI} rightRemoveAmount={rightRemoveAmountForUI} />
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
