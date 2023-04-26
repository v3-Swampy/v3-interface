import useI18n, { compiled } from '@hooks/useI18n';
import dayjs from 'dayjs';
import Decimal from 'decimal.js';
import { useEffect, useState } from 'react';

interface CornerProps {
  timestamp: number;
}

const transitions = {
  en: {
    ended: 'Ended',
    endedIn: 'Ended in: {timeLeftStr}',
    claim: 'Claim your rewards early',
    claimTooltip: 'Claim your rewards early',
    daysStr: '{days} days ',
  },
  zh: {
    ended: 'Ended',
    endedIn: 'Ended in: {timeLeftStr}',
    claim: 'Claim your rewards early',
    claimTooltip: 'Claim your rewards early',
    daysStr: '{days} days ',
  },
} as const;

const Corner: React.FC<CornerProps> = ({ timestamp }) => {
  const i18n = useI18n(transitions);
  const [timeLeft, setTimeLeft] = useState('');
  const [classNames, setClassNames] = useState({
    classNameBorder: '',
    classNameContainer: '',
  });

  useEffect(() => {
    const fn = () => {
      const diff = dayjs(timestamp * 1000).diff(dayjs(), 'second');

      let classNameBorder = '';
      let classNameContainer = '';

      if (new Decimal(diff).lessThan(0)) {
        classNameBorder = 'border-l-gray-slight border-t-gray-slight';
        classNameContainer = 'bg-gray-slight color-white-normal';
      } else if (new Decimal(diff).lessThan(24 * 60 * 60)) {
        classNameContainer = 'bg-orange-normal color-white-normal';
        classNameBorder = 'border-l-orange-normal border-t-orange-normal';
      } else {
        classNameContainer = 'bg-blue-normal color-white-normal';
        classNameBorder = 'border-l-blue-normal border-t-blue-normal';
      }

      setClassNames({
        classNameBorder,
        classNameContainer,
      });

      if (diff <= 0) {
        clearInterval(intervalId);
        setTimeLeft(i18n.ended);
      } else {
        const days = Math.floor(diff / (24 * 60 * 60));
        const hours = Math.floor((diff % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((diff % (60 * 60)) / 60);
        const seconds = diff % 60;
        const dayStr =
          days > 0
            ? compiled(i18n.daysStr, {
                days: days.toString(),
              })
            : '';
        const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        setTimeLeft(compiled(i18n.endedIn, { timeLeftStr: `${dayStr}${timeStr}` }));
      }
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
        flex items-center ${classNames.classNameContainer}
      `}
    >
      <span className="i-mdi:clock mr-1 text-14px"></span>
      <span>{timeLeft}</span>
      <div
        className={`
          absolute border-solid h-0 w-0
          border-l-8px border-t-4px border-r-8px border-b-4px
          ${classNames.classNameBorder}
          border-r-transparent border-b-transparent
          left-0 -bottom-8px color-white-normal`}
      ></div>
    </div>
  );
};

export default Corner;
