import React, { memo, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import cx from 'clsx';
import { type UseFormRegister, type UseFormSetValue, type FieldValues } from 'react-hook-form';
import Input from '@components/Input';
import useI18n, { compiled } from '@hooks/useI18n';
import dayjs from 'dayjs';
import { type Duration } from 'dayjs/plugin/duration';
const duration = dayjs.duration;

interface Props {
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  currentStakeDuration: number;
  currentUnlockTime?: number;
}

const transitions = {
  en: {
    stake_duration: 'Stake Duration',
    stake_until_time: 'Stake until {time}',
    month: 'month',
    months: 'months',
  },
  zh: {
    stake_duration: '质押时间',
    stake_until_time: '质押至 {time} 结束',
    month: '月',
    months: '月',
  },
} as const;

const DurationOptions = [duration(1, 'month'), duration(2, 'month'), duration(3, 'month'), duration(6, 'month'), duration(12, 'month'), duration(18, 'month')];
export const defaultDuration = DurationOptions[0].asSeconds();
export const defaultDurationText = `1 month`;

const DurationSelect: React.FC<Props> = ({ register, setValue, currentStakeDuration, currentUnlockTime }) => {
  const i18n = useI18n(transitions);

  const [untilTime, setUntilTime] = useState('');
  useEffect(() => {
    const unlockTime = currentUnlockTime ? dayjs.unix(currentUnlockTime) : dayjs();
    setUntilTime(unlockTime.add(currentStakeDuration, 'second').format('YYYY-MM-DD HH:00'));
  }, [currentStakeDuration]);

  const handleSelectDuration = useCallback(
    (durationSeconds: number, durationText: { value: number; unit: string }) => {
      setValue('VST-stake-duration', durationSeconds);
      setValue('VST-stake-duration-text', `${durationText.value} ${durationText.unit}`);
    },
    [setValue]
  );

  useLayoutEffect(() => {
    setValue('VST-stake-duration', defaultDuration);
    setValue('VST-stake-duration-text', defaultDurationText);
  }, []);

  return (
    <>
      <p className="pl-8px mb-8px text-14px text-black-normal font-medium">{i18n.stake_duration}</p>
      <div className="p-16px pb-20px rounded-20px bg-orange-light-hover">
        <Input className="text-24px" disabled type="text" defaultValue={defaultDurationText} {...register('VST-stake-duration-text')} />

        <div className="mt-4px flex items-center w-fit h-20px text-14px text-black-normal">{compiled(i18n.stake_until_time, { time: untilTime })}</div>
      </div>

      <div className="mt-16px flex flex-wrap gap-12px">
        {DurationOptions.map((duration, index) => (
          <Duration key={index} duration={duration} onClick={handleSelectDuration} currentStakeDuration={currentStakeDuration} />
        ))}
      </div>
    </>
  );
};

const Duration: React.FC<{
  duration: Duration;
  currentStakeDuration: number;
  onClick: (durationSeconds: number, durationText: { value: number; unit: string }) => void;
}> = memo(({ duration, currentStakeDuration, onClick }) => {
  const i18n = useI18n(transitions);
  const isCurrentSelect = duration.asSeconds() === currentStakeDuration;
  const months = duration.asMonths();
  const unit = months > 1 ? i18n.months : i18n.month;
  const value = months;
  return (
    <div
      className={cx(
        'h-32px px-10px leading-32px rounded-100px border-1px border-solid border-gray-light hover:bg-orange-light-hover text-14px text-gray-light hover:text-orange-normal font-medium cursor-pointer transition-colors',
        isCurrentSelect && 'bg-orange-light-hover !text-orange-normal pointer-events-none'
      )}
      onClick={() => onClick(duration.asSeconds(), { value, unit })}
    >
      {value} {unit}
    </div>
  );
});

export default DurationSelect;
