import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import PageWrapper from '@components/Layout/PageWrapper';
import BorderBox from '@components/Box/BorderBox';
import Settings from '@modules/Settings';
import useI18n from '@hooks/useI18n';
import { exchangeTokenDirection, handleSwap, useCalcDetailAndRouter } from '@service/swap';
import { ReactComponent as ExchangeIcon } from '@assets/icons/exchange.svg';
import SelectedToken from './SelectedToken';
import SubmitButton from './SubmitButton';
import SwapDetail from './SwapDetail';

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
  const sourceTokenAmount = watch('sourceToken-amount', '');
  const destinationTokenAmount = watch('destinationToken-amount', '');

  const onSubmit = useCallback(
    withForm(async (data) => {
      handleSwap({
        sourceTokenAmount: data['sourceToken-amount'],
        destinationTokenAmount: data['destinationToken-amount'],
      });
    }),
    []
  );

  useCalcDetailAndRouter();

  return (
    <PageWrapper className="pt-56px">
      <BorderBox className="relative mx-auto max-w-572px p-16px rounded-28px" variant="gradient-white">
        <div className="mb-16px flex justify-between items-center pr-8px">
          <span className="w-84px h-40px leading-40px rounded-100px text-center text-14px text-black-normal font-medium bg-orange-light-hover">{i18n.swap}</span>
          <Settings />
        </div>

        <form onSubmit={onSubmit}>
          <SelectedToken type="sourceToken" register={register} setValue={setValue} sourceTokenAmount={sourceTokenAmount} destinationTokenAmount={destinationTokenAmount}/>
          <div className="mx-auto -my-21.5px w-fit h-fit p-4px bg-white-normal rounded-full translate-y-0 cursor-pointer" onClick={exchangeTokenDirection}>
            <div className="w-40px h-40px flex justify-center items-center rounded-full bg-orange-light">
              <ExchangeIcon className="w-26px h-26px" />
            </div>
          </div>
          <SelectedToken type="destinationToken" register={register} setValue={setValue} sourceTokenAmount={sourceTokenAmount} destinationTokenAmount={destinationTokenAmount}/>

          <SwapDetail />

          <SubmitButton sourceTokenAmount={sourceTokenAmount} />
        </form>
      </BorderBox>
    </PageWrapper>
  );
};

export default SwapPage;
