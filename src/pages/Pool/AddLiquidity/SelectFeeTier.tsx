import React, { useState, memo } from 'react';
import { atom, useRecoilValue, useRecoilState } from 'recoil';
import { persistAtomWithDefault } from '@utils/recoilUtils';
import cx from 'clsx';
import { type UseFormRegister, type FieldValues } from 'react-hook-form';
import Dropdown from '@components/Dropdown';
import useI18n from '@hooks/useI18n';
import { FeeAmount } from '@service/pairs&pool';
import { ReactComponent as ArrowDownIcon } from '@assets/icons/arrow_down.svg';
import { useIsBothTokenSelected } from './SelectPair';

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
}

const currentFeeState = atom<FeeAmount>({
  key: `pool-currentFeeState-${import.meta.env.MODE}`,
  effects: [persistAtomWithDefault(FeeAmount.LOW)],
});
export const useCurrentFee = () => useRecoilValue(currentFeeState);

const FeeAmountLengh = Object.values(FeeAmount).length / 2;
const FeeAmountList = Object.values(FeeAmount).slice(0, FeeAmountLengh) as FeeAmount[];
const FeeAmountValues = Object.values(FeeAmount).slice(FeeAmountLengh) as number[];

const SelectDropdown: React.FC<{ setVisible: (visible: boolean) => void }> = ({ setVisible }) => {
  const [currentFee, setCurrentFee] = useRecoilState(currentFeeState);

  return (
    <div className="bg-orange-light rounded-bl-16px rounded-br-16px overflow-hidden">
      {FeeAmountList.map((feeAmount, index) =>
        FeeAmountValues[index] === currentFee ? null : (
          <div
            className={cx(
              'flex items-center h-56px px-16px cursor-pointer hover:bg-orange-light-hover hover:bg-opacity-60 transition-colors transition-opacity',
              Number(currentFee) === FeeAmountValues[index] && 'bg-orange-light-hover pointer-events-none'
            )}
            key={feeAmount}
            onClick={() => {
              setCurrentFee(FeeAmountValues[index]);
              setVisible(false);
            }}
          >
            <div className="mr-auto">
              <p className="text-18px leading-24px text-black-normal font-medium">{FeeAmountValues[index] / 10000}%</p>
              {/* TODO hide temporary */}
              {/* <p className="text-14px leading-20px text-gray-normal">Best for most pairs</p> */}
            </div>
            {/* TODO hide temporary */}
            {/* <span className="text-12px text-black-light font-light">1% select</span> */}
          </div>
        )
      )}
    </div>
  );
};

const SelectFeeTier: React.FC<Props> = ({ register }) => {
  const i18n = useI18n(transitions);
  const [visible, setVisible] = useState(false);
  const currentFee = useRecoilValue(currentFeeState);
  const isBothTokenSelected = useIsBothTokenSelected();

  return (
    <div className={cx('mt-16px', !isBothTokenSelected && 'opacity-50 pointer-events-none')}>
      <p className="mb-8px leading-18px text-14px text-black-normal font-medium">{i18n.select_fee_tier}</p>
      <Dropdown visible={visible} Content={<SelectDropdown setVisible={setVisible} />} sameWidth offset={[0, 0]} className="w-full" onClickOutside={() => setVisible(false)}>
        <div
          className={cx('rounded-tl-16px rounded-tr-16px overflow-hidden transition-colors', visible ? 'bg-orange-light' : 'bg-transparent')}
          onClick={() => setVisible((pre) => !pre)}
        >
          <div
            className={cx(
              'flex items-center px-16px h-56px border-2px border-solid rounded-16px cursor-pointer transition-colors',
              visible ? 'bg-orange-light-hover border-transparent' : 'bg-white-normal border-orange-light'
            )}
          >
            <span className="text-18px text-black-normal font-medium mr-auto">{currentFee / 10000}% fee tier</span>
            {/* TODO hide temporary */}
            {/* <span className="px-8px h-20px leading-20px rounded-4px bg-orange-light-hover text-12px text-black-light font-light">93% select</span> */}
            <span className={cx('ml-12px flex-shrink-0 transition-transform', visible && 'rotate-180deg')}>
              <ArrowDownIcon className="w-8px h-5px" />
            </span>
          </div>
        </div>
      </Dropdown>
    </div>
  );
};

export default memo(SelectFeeTier);
