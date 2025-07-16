import useI18n from '@hooks/useI18n';
import dayjs from 'dayjs';
import { ReactComponent as ClockIcon } from '@assets/icons/clock.svg';

interface CornerProps {
  timestamp: number;
}

const transitions = {
  en: {
    end: 'End',
  },
  zh: {
    end: 'End',
  },
} as const;

const Corner: React.FC<CornerProps> = ({ timestamp }) => {
  const i18n = useI18n(transitions);
  const isEnd = dayjs(timestamp * 1000).diff(dayjs(), 'second') <= 0;

  return (
    <div
      className={`
        inline-block h-6 min-w-6 absolute left-0 -top-3 
        px-14px rounded-2 rounded-lb-0 text-12px 
        items-center justify-between 
        ${isEnd ? 'flex bg-gray-slight color-white-normal' : 'hidden'}
        lt-mobile:-ml-1px z-10
      `}
    >
      <span className="inline-flex">
        {isEnd ? null : <ClockIcon className="mr-1 w-12px h-12px" />}
        <span>{i18n.end}</span>
      </span>

      <div
        className={`
            absolute border-solid h-0 w-0
            border-l-8px border-t-4px border-r-8px border-b-4px
            border-r-transparent border-b-transparent
            left-0 -bottom-8px color-white-normal
            ${isEnd ? 'border-l-gray-slight border-t-gray-slight' : ''}
          `}
      ></div>
    </div>
  );
};

export default Corner;
