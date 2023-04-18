import React, { useMemo } from 'react';
import useI18n from '@hooks/useI18n';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as HammerIcon } from '@assets/icons/harmmer.svg';
import { ReactComponent as CoffeeCupIcon } from '@assets/icons/coffee_cup.svg';
import { useStakedPositionsByPool, useWhichIncentiveTokenIdIn } from '@service/farming/myFarms';
import { PositionForUI, usePositionStatus, PositionStatus } from '@service/position';
import { getCurrentIncentivePeriod } from '@service/farming';

const transitions = {
  en: {
    myPosition: 'My Positions',
    farming: 'Farming',
    paused: 'Paused',
    claim: 'Claim',
    unstake: 'Unstake',
    claimable: 'Claimable',
    liquidity: 'Liquidity',
  },
  zh: {
    myPosition: 'My Positions',
    farming: 'Farming',
    paused: 'Paused',
    claim: 'Claim',
    unstake: 'Unstake',
    claimable: 'Claimable',
    liquidity: 'Liquidity',
  },
} as const;

const className = {
  title: 'color-gray-normal text-xs font-500 not-italic leading-15px mb-2',
  content: 'color-black-normal text-12px font-500 not-italic leading-15px',
  buttonBase: 'flex items-center h-8 rounded-full py-7px px-20.5px relative cursor-pointer',
  buttonFarming: 'bg-green-normal/10 color-green-normal',
  buttonPaused: 'bg-orange-dot/10 color-orange-dot',
  buttonPausedSolid: 'color-orange-dot border border-solid border-orange-dot',
  incentiveHit: 'h-6 rounded-full px-10px ml-1 flex items-center',
};

const PostionItem: React.FC<{ position: PositionForUI; token0Price?: string; token1Price?: string }> = ({ position, token0Price, token1Price }) => {
  const i18n = useI18n(transitions);
  const isEnded = false;
  const whichIncentive = useWhichIncentiveTokenIdIn(position.id);
  console.info('whichIncentive', whichIncentive);
  const status = usePositionStatus(position);
  const isPaused = useMemo(() => {
    return status == PositionStatus.OutOfRange;
  }, [status]);

  let liquidity = useMemo(() => {
    if (token0Price && token1Price && position.amount0 && position.amount1) {
      return position.amount0.mul(token0Price).add(position.amount1.mul(token1Price)).toDecimalStandardUnit(5);
    }

    return '0';
  }, [token0Price, token1Price, position.amount0, position.amount1]);

  return (
    <div key={position.id} className="flex items-center justify-between mt-4">
      <div className={`${className.buttonBase} ${isPaused ? className.buttonPaused : className.buttonFarming} ml-15px`}>
        <span className={`inline-block ${isPaused ? 'bg-orange-dot' : 'bg-green-normal'} w-6px h-6px rounded-full absolute -left-14px`}></span>
        {isPaused ? <CoffeeCupIcon className="w-6 h-6 mr-1"></CoffeeCupIcon> : <HammerIcon className="w-6 h-6 mr-1"></HammerIcon>}
        {isPaused ? i18n.paused : i18n.farming}
      </div>
      <div className="">
        <div className={`${className.title}`}>{i18n.liquidity}</div>
        <div className={`${className.content} flex items-center`}>${numFormat(liquidity)}</div>
      </div>
      <div className="">
        <div className={`${className.title}`}>{i18n.claimable}</div>
        <div className={`${className.content} flex items-center`}>${numFormat(position?.liquidity)} VST</div>
      </div>
      <div className="flex items-center">
        {isEnded ? (
          <div className={`${className.buttonBase} ${className.buttonPausedSolid}`}>
            {i18n.claim} & {i18n.unstake}
          </div>
        ) : (
          <>
            <div className={`${className.buttonBase} mr-15px color-green-normal border border-solid border-green-normal`}>{i18n.claim}</div>
            <div className={`${className.buttonBase} ${className.buttonPausedSolid}`}>{i18n.unstake}</div>
          </>
        )}
      </div>
    </div>
  );
};

const Postions: React.FC<{ poolAddress: string; token0Price?: string; token1Price?: string }> = ({ poolAddress, token0Price, token1Price }) => {
  const i18n = useI18n(transitions);
  const positions = useStakedPositionsByPool(poolAddress);
  const currentIncentive = getCurrentIncentivePeriod();
  const isEnded = false;

  return (
    <div className="rounded-4 bg-white-normal p-6 mt-6">
      <div className="flex items-center">
        <span className="text-14px font-500 font-not-italic leading-18px color-gray-normal">
          {i18n.myPosition} ({positions.length})
        </span>
        <span className={`${className.incentiveHit} ${isEnded ? 'color-white-normal bg-gray-normal' : 'color-orange-normal bg-orange-normal/10'}`}>
          <span className="i-mdi:clock"></span>
          <span className="text-12px font-400 font-not-italic leading-15px ml-0.5">Incentive until: {new Date(currentIncentive.endTime * 1000).toLocaleString()}</span>
        </span>
      </div>
      <div>
        {positions.map((p: any) => (
          <PostionItem position={p} token0Price={token0Price} token1Price={token1Price} />
        ))}
      </div>
    </div>
  );
};

export default Postions;
