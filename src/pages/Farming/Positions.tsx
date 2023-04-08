import React from 'react';
import useI18n from '@hooks/useI18n';
import { type Token } from '@service/tokens';
import { numFormat } from '@utils/numberUtils';
import { ReactComponent as LightningIcon } from '@assets/icons/lightning.svg';
import { ReactComponent as ChevronDownIcon } from '@assets/icons/chevron_down.svg';
import ToolTip from '@components/Tooltip';
import dayjs from 'dayjs';
import Decimal from 'decimal.js';

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
    isPaused: false,
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
};

const Postions: React.FC<{ poolAddress: string }> = ({ poolAddress }) => {
  const i18n = useI18n(transitions);

  // TODO, fetch real data
  const data: PositionProps[] = FAKE_POSITIONS;

  return (
    <div className="rounded-4 bg-white-normal p-6 mt-6">
      <div className="flex items-center">
        <span className="text-14px font-500 font-not-italic leading-18px color-gray-normal">
          {i18n.myPosition} ({data.length})
        </span>
        <span className="h-6 rounded-full bg-orange-light px-10px ml-1 flex items-center">
          <span className="i-mdi:clock color-orange-normal"></span>
          <span className="color-orange-normal text-12px font-400 font-not-italic leading-15px ml-0.5">Incentive until xxx</span>
        </span>
      </div>
      <div>
        {data.map((d) => (
          <div key={d.pid} className="flex items-center justify-between mt-4">
            <div className="flex items-center">1</div>
            <div className="">
              <div className={`${className.title}`}>{i18n.liquidity}</div>
              <div className={`${className.content} flex items-center`}>${numFormat(d.liquidity)}</div>
            </div>
            <div className="">
              <div className={`${className.title}`}>{i18n.claimable}</div>
              <div className={`${className.content} flex items-center`}>${numFormat(d.claimable)} VST</div>
            </div>
            <div className="flex items-center">4</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Postions;
