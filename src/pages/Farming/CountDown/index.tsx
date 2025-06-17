import useI18n, { compiled } from '@hooks/useI18n';
import dayjs from 'dayjs';
import { useEffect, useState, useMemo } from 'react';
import Tooltip from '@components/Tooltip';
import { ReactComponent as InfoIcon } from '@assets/icons/info.svg';
import { useClaimStartTime } from '@service/farming';
import { addZeroToDay } from '@utils/numberUtils';
import BorderBox from '@components/Box/BorderBox';
import './index.css';

const transitions = {
  en: {
    claimOpeningAt: 'Claim will opening at',
    tooltipClaim: 'Claim rewards starting: {date} . Unstaking LP before the claim time will result in losing all earned rewards.',
    days: 'Days',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
  },
  zh: {
    claimOpeningAt: 'Claim will opening at',
    tooltipClaim: 'Claim rewards starting: {date} . Unstaking LP before the claim time will result in losing all earned rewards.',
    days: 'Days',
    hours: 'Hours',
    minutes: 'Minutes',
    seconds: 'Seconds',
  },
} as const;

const ONE_HOUR = 60 * 60;
const ONE_DAY = 24 * 60 * 60;
const DEFAULT_DAY = '00';

const CountDown: React.FC = ({}) => {
  const claimTime = useClaimStartTime();
  const i18n = useI18n(transitions);
  const [days, setDays] = useState<string>(DEFAULT_DAY);
  const [hours, setHours] = useState<string>(DEFAULT_DAY);
  const [minutes, setMinutes] = useState<string>(DEFAULT_DAY);
  const [seconds, setSeconds] = useState<string>(DEFAULT_DAY);

  useEffect(() => {
    const fn = () => {
      const diff = dayjs(claimTime * 1000).diff(dayjs(), 'second');

      if (diff <= 0) {
        clearInterval(intervalId);
      } else {
        const days = Math.floor(diff / ONE_DAY);
        const hours = Math.floor((diff % ONE_DAY) / ONE_HOUR);
        const minutes = Math.floor((diff % ONE_HOUR) / 60);
        const seconds = diff % 60;
        setDays(addZeroToDay(days));
        setHours(addZeroToDay(hours));
        setMinutes(addZeroToDay(minutes));
        setSeconds(addZeroToDay(seconds));
      }
    };

    const intervalId = setInterval(fn, 1000);

    fn();

    return () => clearInterval(intervalId);
  }, [claimTime]);

  const claimTimeDate = useMemo(() => new Date(claimTime * 1000).toLocaleString(), [claimTime]);
  const classNames = {
    colon: '-mt-0.5',
  };

  return (
    <BorderBox className="relative w-220px rounded-20px lt-mobile:mt-4" variant="gradient-white">
      <div className="w-54 h-16 ">
        <div className="h-25px text-12px leading-15px color-white-normal flex items-center justify-center rounded-t-16px gradient-orange-light-hover">
          {i18n.claimOpeningAt}
          <Tooltip text={compiled(i18n.tooltipClaim, { date: claimTimeDate })}>
            <span className="w-12px h-12px ml-6px">
              <InfoIcon className="w-12px h-12px color-white-normal" />
            </span>
          </Tooltip>
        </div>
        <div className="bg-white-normal h-39px color-black-normal rounded-b-18px">
          <div className="flex justify-around items-center font-700 text-16px leading-20px">
            <span>{days}</span>
            <span className={classNames.colon}>&#58;</span>
            <span>{hours}</span>
            <span className={classNames.colon}>&#58;</span>
            <span>{minutes}</span>
            <span className={classNames.colon}>&#58;</span>
            <div className="mr-12px">{seconds}</div>
          </div>
          <div className="text-10px leading-13px flex  items-center text-12px text-center mt-2px">
            <div className="flex-1 ml--5px">{i18n.days}</div>
            <div className="flex-1">{i18n.hours}</div>
            <div className="flex-1 mr--5px">{i18n.minutes}</div>
            <div className="flex-1">{i18n.seconds}</div>
          </div>
        </div>
      </div>
    </BorderBox>
  );
};

export default CountDown;
