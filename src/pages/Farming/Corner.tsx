import useI18n from '@hooks/useI18n';
import dayjs from 'dayjs';
import Decimal from 'decimal.js';

interface CornerProps {
  timestatmp: number;
}

const transitions = {
  en: {
    ended: 'Ended',
    endedIn: 'Ended in: ',
    claim: 'Claim your rewards early',
    claimTooltip: 'Claim your rewards early',
  },
  zh: {
    ended: 'Ended',
    endedIn: 'Ended in: ',
    claim: 'Claim your rewards early',
    claimTooltip: 'Claim your rewards early',
  },
} as const;

const Corner: React.FC<CornerProps> = ({ timestatmp }) => {
  const i18n = useI18n(transitions);

  let classNameBorder = '';
  let className = '';
  let text = '';

  const diff = new Decimal(timestatmp * 1000).minus(dayjs().valueOf());

  // TODO with real data
  if (diff.lessThan(0)) {
    classNameBorder = 'border-l-gray-normal border-t-gray-normal';
    className = 'bg-gray-normal color-white-normal';
    text = i18n.ended;
  } else if (diff.lessThan(7 * 24 * 60 * 60 * 1000)) {
    className = 'bg-orange-normal color-white-normal';
    classNameBorder = 'border-l-orange-normal border-t-orange-normal';
    text = i18n.endedIn;
  } else {
    className = 'bg-blue-normal color-white-normal';
    classNameBorder = 'border-l-blue-normal border-t-blue-normal';
    text = i18n.endedIn;
  }

  const time = dayjs(timestatmp * 1000).format('DD/MM/YYYY HH:mm:ss');

  return (
    <div
      className={`
        inline-block h-6 min-w-6 absolute left-0 -top-3 
        px-14px rounded-2 rounded-lb-0 font-400 text-12px 
        flex items-center ${className}
      `}
    >
      <span className="i-mdi:clock mr-1"></span>
      <span>
        {text} {status !== 'ended' ? time : null}
      </span>
      <div
        className={`
          absolute border-solid h-0 w-0
          border-l-8px border-t-4px border-r-8px border-b-4px
          ${classNameBorder}
          border-r-transparent border-b-transparent
          left-0 -bottom-8px color-white-normal`}
      ></div>
    </div>
  );
};

export default Corner;
