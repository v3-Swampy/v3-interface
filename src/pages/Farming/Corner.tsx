import useI18n, { compiled } from '@hooks/useI18n';
import dayjs from 'dayjs';
import Decimal from 'decimal.js';
import { useEffect, useState } from 'react';

interface CornerProps {
  timestamp: number;
}

const transitions = {
  en: {
    end: 'End',
    endIn: 'End in: {timeLeftStr}',
    claim: 'Claim your rewards early',
    claimTooltip: 'Claim your rewards early',
    daysStr: '{days} days ',
  },
  zh: {
    end: 'End',
    endIn: 'End in: {timeLeftStr}',
    claim: 'Claim your rewards early',
    claimTooltip: 'Claim your rewards early',
    daysStr: '{days} days ',
  },
} as const;

const CLASS_NAMES = {
  default: {
    classNameContainer: 'hidden',
    classNameBorder: '',
  },
  gray: {
    classNameContainer: 'flex bg-gray-slight color-white-normal',
    classNameBorder: 'border-l-gray-slight border-t-gray-slight',
  },
  blue: {
    classNameContainer: 'flex bg-blue-normal color-white-normal w-176px',
    classNameBorder: 'border-l-blue-normal border-t-blue-normal',
  },
  red: {
    classNameContainer: 'flex bg-orange-normal color-white-normal w-270px',
    classNameBorder: 'border-l-orange-normal border-t-orange-normal',
  },
};

const ONE_HOUR = 60 * 60;
const ONE_DAY = 24 * 60 * 60;
const ONE_WEEK = 7 * ONE_DAY;

type StateType = 'default' | 'gray' | 'blue' | 'red';

const Corner: React.FC<CornerProps> = ({ timestamp }) => {
  const i18n = useI18n(transitions);
  const [timeLeft, setTimeLeft] = useState('');

  // gray: end, blue: 24h, red: 24h < time < 7d, empty: > 7d
  const [state, setState] = useState<StateType>('default');

  useEffect(() => {
    const fn = () => {
      const diff = dayjs(timestamp * 1000).diff(dayjs(), 'second');
      let timeLeft = '';
      let state: StateType = 'default';

      if (diff <= 0) {
        clearInterval(intervalId);
        timeLeft = i18n.end;
      } else {
        const days = Math.floor(diff / ONE_DAY);
        const hours = Math.floor((diff % ONE_DAY) / ONE_HOUR);
        const minutes = Math.floor((diff % ONE_HOUR) / 60);
        const seconds = diff % 60;
        const dayStr =
          days > 0
            ? compiled(i18n.daysStr, {
                days: days.toString(),
              })
            : '';
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        timeLeft = compiled(i18n.endIn, { timeLeftStr: `${dayStr}${timeStr}` });
      }

      if (new Decimal(diff).lte(0)) {
        state = 'gray';
      } else if (new Decimal(diff).lt(ONE_DAY)) {
        state = 'red';
      } else if (new Decimal(diff).gte(ONE_DAY) && new Decimal(diff).lte(ONE_WEEK)) {
        state = 'blue';
      } else {
        state = 'default';
      }

      setState(state);
      setTimeLeft(timeLeft);
    };

    const intervalId = setInterval(fn, 1000);

    fn();

    return () => clearInterval(intervalId);
  }, [timestamp]);

  return (
    <div
      className={`
        inline-block h-6 min-w-6 absolute left-0 -top-3 
        px-14px rounded-2 rounded-lb-0 font-400 text-12px 
        items-center justify-between ${CLASS_NAMES[state].classNameContainer}
      `}
    >
      <span className="inline-flex">
        <span className="i-mdi:clock mr-1 text-14px"></span>
        <span>{timeLeft}</span>
      </span>
      {state === 'red' && <span>{i18n.claim}</span>}

      <div
        className={`
          absolute border-solid h-0 w-0
          border-l-8px border-t-4px border-r-8px border-b-4px
          ${CLASS_NAMES[state].classNameBorder}
          border-r-transparent border-b-transparent
          left-0 -bottom-8px color-white-normal`}
      ></div>
    </div>
  );
};

export default Corner;
