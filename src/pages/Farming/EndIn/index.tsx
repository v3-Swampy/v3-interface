import useI18n, { compiled } from '@hooks/useI18n';
import dayjs from 'dayjs';
import Decimal from 'decimal.js';
import { useEffect, useState } from 'react';
import { ReactComponent as AlarmClockIcon } from '@assets/icons/alarm-clock.svg';
import { getCurrentIncentivePeriod } from '@service/farming';

interface EndInProps {
  children: React.ReactNode;
}

const transitions = {
  en: {
    end: 'End',
    endIn: 'The next round of rewards will start in {timeLeftStr}',
    claim: ' , claim rewards earlier is recommended.',
    claimTooltip: 'Claim your rewards early',
    daysStr: '{days} days ',
  },
  zh: {
    end: 'End',
    endIn: 'The next round of rewards will start in {timeLeftStr}',
    claim: ' , claim rewards earlier is recommended.',
    claimTooltip: 'Claim your rewards early',
    daysStr: '{days} days ',
  },
} as const;

const ONE_HOUR = 60 * 60;
const ONE_DAY = 24 * 60 * 60;
const ONE_WEEK = 7 * ONE_DAY;

type StateType = 'default' | 'normal' | 'urgent';

const EndIn: React.FC<EndInProps> = ({ children }) => {
  const timestamp = getCurrentIncentivePeriod().endTime;
  const i18n = useI18n(transitions);
  const [timeLeft, setTimeLeft] = useState('');

  // default  : time < 0 || time > 7d
  // urgent   : time < 24h
  // normal   : 24h < time < 7d
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

      const d = new Decimal(diff);

      if (d.lt(0) || d.gt(ONE_WEEK)) {
        state = 'default';
      } else if (d.lt(ONE_DAY)) {
        state = 'urgent';
      } else if (d.gte(ONE_DAY) && d.lte(ONE_WEEK)) {
        state = 'normal';
      }

      setState(state);
      setTimeLeft(timeLeft);
    };

    const intervalId = setInterval(fn, 1000);

    fn();

    return () => clearInterval(intervalId);
  }, [timestamp]);

  const fTimeLeft = timeLeft.replace(/(\d+)/g, '<span style="font-family: Helvetica Neue;">$1</span>');

  return (
    <div className={`relative w-full p-0.5 rounded-7 gradient-orange-light-hover`}>
      {(state === 'urgent' || state === 'normal') && (
        <div className="flex items-center p-4 text-14px leading-24px font-400 font-normal color-white-normal">
          <span className="inline-flex">
            <AlarmClockIcon className="mr-2 w-6 h-6" />
            <span dangerouslySetInnerHTML={{ __html: fTimeLeft }}></span>
          </span>
          {state === 'urgent' && <span>{i18n.claim}</span>}
        </div>
      )}
      <div className={`bg-white-normal rounded-6.5 p-4`}>{children}</div>
    </div>
  );
};

export default EndIn;
