import React, { memo, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import cx from 'clsx';
import { type UseFormRegister, type UseFormSetValue, type FieldValues } from 'react-hook-form';
import Input from '@components/Input';
import useI18n, { compiled } from '@hooks/useI18n';
import dayjs from 'dayjs';
import durationPlugin from 'dayjs/plugin/duration';
dayjs.extend(durationPlugin);
const duration = dayjs.duration;

interface Props {
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  currentStakeDuration: number;
}

const transitions = {
  en: {
    stake_duration: 'Stake Duration',
    stake_until_time: 'Stake until {time}',
    week: 'week',
    weeks: 'weeks',
    month: 'month',
    months: 'months',
  },
  zh: {
    stake_duration: '质押时间',
    stake_until_time: '质押至 {time} 结束',
    week: '周',
    weeks: '周',
    month: '月',
    months: '月',
  },
} as const;

const DurationOptions = [duration(1, 'week'), duration(2, 'week'), duration(1, 'month'), duration(2, 'month'), duration(3, 'month'), duration(6, 'month')];
export const defaultDuration = DurationOptions[0].asSeconds();
const defaultDurationText = `1 week`;

const DurationSelect: React.FC<Props> = ({ register, setValue, currentStakeDuration }) => {
  const i18n = useI18n(transitions);

  const [untilTime, setUntilTime] = useState('');
  useEffect(() => {
    setUntilTime(dayjs().add(currentStakeDuration, 'second').format('YYYY-MM-DD HH:00'));
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
      <div className="mt-16px py-16px pl-24px pr-16px rounded-20px bg-orange-light-hover">
        <p className="mb-8px text-14px text-black-normal font-medium">{i18n.stake_duration}</p>
        <Input className="text-32px" disabled type="text" defaultValue={defaultDurationText} {...register('VST-stake-duration-text')} />

        <div className="mt-8px flex items-center w-fit h-20px text-12px text-black-normal">{compiled(i18n.stake_until_time, { time: untilTime })}</div>
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
  duration: durationPlugin.Duration;
  currentStakeDuration: number;
  onClick: (durationSeconds: number, durationText: { value: number; unit: string }) => void;
}> = memo(({ duration, currentStakeDuration, onClick }) => {
  const i18n = useI18n(transitions);
  const isCurrentSelect = duration.asSeconds() === currentStakeDuration;
  const weeks = duration.weeks();
  const months = duration.months();
  const unit = months >= 1 ? (months > 1 ? i18n.months : i18n.month) : weeks > 1 ? i18n.weeks : i18n.week;
  const value = months >= 1 ? months : weeks;
  return (
    <div
      className={cx(
        'h-34px px-10px leading-34px rounded-100px border-1px border-solid border-orange-light hover:bg-orange-light-hover text-14px text-black-normal font-medium cursor-pointer transition-colors',
        isCurrentSelect && 'bg-orange-light-hover pointer-events-none'
      )}
      onClick={() => onClick(duration.asSeconds(), { value, unit })}
    >
      {value} {unit}
    </div>
  );
});

export default DurationSelect;
