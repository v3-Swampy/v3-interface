import React from 'react';
import useI18n from '@hooks/useI18n';
import Slider from 'rc-slider';

const transitions = {
  en: {
    amount: 'Amount',
  },
  zh: {
    amount: 'Amount',
  },
} as const;

const marks = [0, 25, 50, 75, 100].reduce((acc: any, cur) => {
  acc[cur] = <div className={`text-black-normal font-medium leading-15px  text-left  ${cur === 100 ? '-ml-20px' : 'ml-12px'}`}>{cur}%</div>;
  return acc;
}, {});

const AmountSlider: React.FC = () => {
  const i18n = useI18n(transitions);

  return (
    <div className="bg-orange-light-hover flex rounded-20px pt-16px pb-32px px-16px mt-12px">
      <div className="font-medium text-sm leading-18px mr-48px">
        <p className="mb-12px">{i18n.amount}</p>
        <p className="text-32px leading-40px">25%</p>
      </div>
      <Slider
        className="mt-34px"
        range={false}
        min={0}
        max={100}
        marks={marks}
        trackStyle={{ background: 'linear-gradient(94.16deg, #ee9b27 -1.32%, #e14d28 46.7%, #6f84b8 95.78%)', height: '12px' }}
        railStyle={{ backgroundColor: '#FFE8C9', height: '12px' }}
        handleStyle={{
          height: 18,
          width: 18,
          marginTop: -4,
          backgroundColor: '#fff',
          marginLeft: 2,
        }}
        dotStyle={{ border: 'none', background: 'transparent' }}
        activeDotStyle={(dotValue) => {
          if (dotValue) return { background: 'white', height: '8px', width: '8px', top: '2px' };
          return {};
        }}
      />
    </div>
  );
};

export default AmountSlider;
