import React, { memo } from 'react';
import useI18n from '@hooks/useI18n';
import { useSourceToken, useDestinationToken } from '@service/swap';

const transitions = {
  en: {
    please_select_token: 'Please select token',
    swap: 'Swap',
  },
  zh: {
    please_select_token: '请选择代币',
    swap: '交换',
  },
} as const;

const SubmitButton: React.FC = () => {
  const i18n = useI18n(transitions);
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();

  const isTokenSelected = sourceToken && destinationToken;

  return <button className="w-full block mt-24px" disabled={!isTokenSelected}>{isTokenSelected ? i18n.swap : i18n.please_select_token}</button>;
};

export default memo(SubmitButton);
