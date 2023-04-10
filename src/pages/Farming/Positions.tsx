import React from 'react';
import useI18n from '@hooks/useI18n';
import { type Token } from '@service/tokens';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as HammerIcon } from '@assets/icons/harmmer.svg';
import { ReactComponent as CoffeeCupIcon } from '@assets/icons/coffee_cup.svg';
import ToolTip from '@components/Tooltip';

1681093820;

const FAKE_POSITIONS = [
  {
    pid: 100,
    isPaused: false,
    liquidity: '100000',
    claimable: '100000',
    incentiveTime: '1681975298',
  },
  {
    pid: 200,
    isPaused: true,
    liquidity: '90000',
    claimable: '90000',
    incentiveTime: '1681024898',
  },
  {
    pid: 300,
    isPaused: false,
    liquidity: '8000',
    claimable: '8000',
    incentiveTime: '1680852098',
  },
];

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

interface PositionProps {
  pid: number;
  isPaused: boolean;
  liquidity: string;
  claimable: string;
  incentiveTime: string;
}

const className = {
  title: 'color-gray-normal text-xs font-500 not-italic leading-15px mb-2',
  content: 'color-black-normal text-12px font-500 not-italic leading-15px',
  buttonBase: 'flex items-center h-8 rounded-full py-7px px-20.5px relative cursor-pointer',
  buttonFarming: 'bg-green-light color-green-normal',
  buttonPaused: 'bg-orange-dotbg color-orange-dot',
  buttonPausedSolid: 'color-orange-dot border border-solid border-orange-dot',
  incentiveHit: 'h-6 rounded-full px-10px ml-1 flex items-center',
};

const Postions: React.FC<{ poolAddress: string }> = ({ poolAddress }) => {
  const i18n = useI18n(transitions);

  // TODO, fetch real data
  const data: PositionProps[] = FAKE_POSITIONS;
  const isEnded = false;
  // const isEnded = true;

  return (
    <div className="rounded-4 bg-white-normal p-6 mt-6">
      <div className="flex items-center">
        <span className="text-14px font-500 font-not-italic leading-18px color-gray-normal">
          {i18n.myPosition} ({data.length})
        </span>
        <span className={`${className.incentiveHit} ${isEnded ? 'color-white-normal bg-gray-normal' : 'color-orange-normal bg-orange-normalbg'}`}>
          <span className="i-mdi:clock"></span>
          <span className="text-12px font-400 font-not-italic leading-15px ml-0.5">Incentive until: xxx</span>
        </span>
      </div>
      <div>
        {data.map((d) => {
          return (
            <div key={d.pid} className="flex items-center justify-between mt-4">
              <div className={`${className.buttonBase} ${d.isPaused ? className.buttonPaused : className.buttonFarming} ml-15px`}>
                <span className={`inline-block ${d.isPaused ? 'bg-orange-dot' : 'bg-green-normal'} w-6px h-6px rounded-full absolute -left-14px`}></span>
                {d.isPaused ? <CoffeeCupIcon className="w-6 h-6 mr-1"></CoffeeCupIcon> : <HammerIcon className="w-6 h-6 mr-1"></HammerIcon>}
                {d.isPaused ? i18n.paused : i18n.farming}
              </div>
              <div className="">
                <div className={`${className.title}`}>{i18n.liquidity}</div>
                <div className={`${className.content} flex items-center`}>${numFormat(d.liquidity)}</div>
              </div>
              <div className="">
                <div className={`${className.title}`}>{i18n.claimable}</div>
                <div className={`${className.content} flex items-center`}>${numFormat(d.claimable)} VST</div>
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
        })}
      </div>
    </div>
  );
};

export default Postions;
