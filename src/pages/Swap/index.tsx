import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import PageWrapper from '@components/Layout/PageWrapper';
import useI18n from '@hooks/useI18n';
import TokenItem from './TokenItem';
import SubmitButton from './SubmitButton';

const transitions = {
  en: {
    swap: 'Swap',
  },
  zh: {
    swap: '兑换',
  },
} as const;

const SwapPage: React.FC = () => {
  const i18n = useI18n(transitions);
  const { register, handleSubmit: withForm, setValue, watch } = useForm();

  const onSubmit = useCallback(
    withForm(async (data) => {}),
    []
  );

  return (
    <PageWrapper className="">
      <div className="mx-auto max-w-464px p-8px rounded-8px border-#d2d9ee bg-white">
        <div className="flex justify-between items-center px-8px py-12px mb-8px">
          <span className="text-16px text-#0d111c font-medium">{i18n.swap}</span>
          <span className="i-bi:gear text-18px" />
        </div>

        <form onSubmit={onSubmit}>
          <TokenItem type="sourceToken" register={register} setValue={setValue} />
          <div className='mx-auto -my-17.5px w-40px h-40px p-4px bg-white rounded-12px translate-y-0 cursor-pointer'>
            <div className='w-full h-full flex justify-center items-center rounded-8px bg-#E8ECFB'>
              <span className="i-mdi:arrow-down" />
            </div>
          </div>
          <TokenItem type="destinationToken" register={register} setValue={setValue} />
          <SubmitButton />
        </form>
      </div>
    </PageWrapper>
  );
};

export default SwapPage;
