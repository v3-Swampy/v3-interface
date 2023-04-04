import React from 'react';
import cx from 'clsx';
import { type UseFormRegister, type UseFormSetValue, type FieldValues } from 'react-hook-form';
import Dropdown from '@components/Dropdown';
import useI18n from '@hooks/useI18n';
import { FeeAmount } from '@service/pairs&pool';

const transitions = {
  en: {
    select_fee_tier: 'Select fee tier',
  },
  zh: {
    select_fee_tier: '选择手续费级别',
  },
} as const;

interface Props {
  register: UseFormRegister<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  currentFee: FeeAmount;
  isBothTokenSelected: boolean;
}

const FeeAmountLengh = Object.values(FeeAmount).length / 2;
const FeeAmountList = Object.values(FeeAmount).slice(0, FeeAmountLengh);
const FeeAmountValues = Object.values(FeeAmount).slice(FeeAmountLengh) as number[];

const SelectDropdown: React.FC<Pick<Props, 'currentFee' | 'setValue'>> = ({ currentFee, setValue }) => {
  console.log(currentFee)
  return (
    <div className="bg-orange-light rounded-16px">
      {FeeAmountList.map((feeAmount, index) => (
        <div
          className={cx(
            'flex items-center h-56px px-16px cursor-pointer hover:bg-orange-light-hover transition-colors',
            currentFee === FeeAmountValues[index] && 'bg-orange-light-hover pointer-events-none'
          )}
          key={feeAmount}
        >
          <div className="mr-auto">
            <p className="text-18px leading-24px text-black-normal font-medium">{FeeAmountValues[index] / 10000}%</p>
            <p className="text-14px leading-20px text-gray-normal">Best for most pairs</p>
          </div>
          <span className="text-12px text-black-light font-light">1% select</span>
        </div>
      ))}
    </div>
  );
};

const SelectFeeTier: React.FC<Props> = ({ isBothTokenSelected, setValue, register, currentFee }) => {
  const i18n = useI18n(transitions);
  console.log(currentFee)
  return (
    <div className={cx('mt-16px mb-8px', !isBothTokenSelected && 'opacity-50 pointer-events-none')}>
      <p className="leading-18px text-14px text-black-normal font-medium">{i18n.select_fee_tier}</p>
      <Dropdown placement="bottom" trigger="click" Content={<SelectDropdown currentFee={currentFee} setValue={setValue} />} sameWidth offset={[0, 0]} className="w-full">
        <div className="flex items-center px-16px h-56px border-2px border-solid border-orange-light rounded-16px cursor-pointer">
          <input
            className="display-none"
            {...register('fee', {
              required: true,
            })}
            type="number"
          />
          <span className="text-18px text-black-normal font-medium mr-auto">0.3% fee tier</span>
          <span className="px-8px h-20px leading-20px rounded-4px bg-orange-light-hover text-12px text-black-light font-light">93% select</span>
          <span className="i-ic:sharp-keyboard-arrow-down ml-12px flex-shrink-0 text-16px font-medium" />
        </div>
      </Dropdown>
    </div>
  );
};

export default SelectFeeTier;
