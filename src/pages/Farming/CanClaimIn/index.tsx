import useI18n, { compiled } from '@hooks/useI18n';
import dayjs from 'dayjs';
import cx from 'clsx';
import { useEffect, useState } from 'react';
import { ReactComponent as AlarmClockIcon } from '@assets/icons/alarm-clock.svg';
import { useClaimStartTime } from '@service/farming';
import BorderBox from '@components/Box/BorderBox';

interface CanClaimInProps {
  children: React.ReactNode;
}

const transitions = {
  en: {
    endIn: 'Reward claiming will open in {timeLeftStr}',
    daysStr: '{days} days ',
  },
  zh: {
    endIn: 'Reward claiming will open in {timeLeftStr}',
    daysStr: '{days} days ',
  },
} as const;

const ONE_HOUR = 60 * 60;
const ONE_DAY = 24 * 60 * 60;

const CanClaimIn: React.FC<CanClaimInProps> = ({ children }) => {
  const claimStartTime = useClaimStartTime();
  const claimTimeFormatted = dayjs(claimStartTime * 1000).format('YYYY/MM/DD HH:mm:ss');
  const i18n = useI18n(transitions);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function updateTimeLeft() {
      const diff = dayjs(claimStartTime * 1000).diff(dayjs(), 'second');

      if (diff <= 0) {
        setTimeLeft('');
        return false;
      }
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
      setTimeLeft(compiled(i18n.endIn, { timeLeftStr: `${dayStr}${timeStr} (${claimTimeFormatted})` }));
      return true;
    }

    // 先立即执行一次
    let shouldContinue = updateTimeLeft();
    if (!shouldContinue) return;

    const intervalId = setInterval(() => {
      const stillCounting = updateTimeLeft();
      if (!stillCounting) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [claimStartTime]);

  const fTimeLeft = timeLeft.replace(/(\d+)/g, '<span style="font-family: Helvetica Neue;">$1</span>');

  return (
    <BorderBox className="rounded-7 lt-mobile:rounded-4 overflow-hidden" variant="gradient-white">
      {!!timeLeft && (
        <div
          className="flex items-center p-4 pb-11 text-14px leading-24px font-normal color-white-normal lt-mobile:px-4 lt-mobile:py-3 lt-mobile:pb-7"
          style={{ background: 'linear-gradient(94.16deg, #EE9B27 -1.32%, #E14D28 46.7%, #6F84B8 95.78%)' }}
        >
          <AlarmClockIcon className="mr-2 w-6 h-6 flex-shrink-0" />
          <span dangerouslySetInnerHTML={{ __html: fTimeLeft }}></span>
        </div>
      )}

      <div className={cx('bg-white-normal rounded-7 lt-mobile:rounded-4 p-4', !!timeLeft && '-mt-7 lt-mobile:-mt-4')}>{children}</div>
    </BorderBox>
  );
};

export default CanClaimIn;
