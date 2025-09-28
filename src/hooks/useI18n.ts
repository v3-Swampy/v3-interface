import { atom, useRecoilValue } from 'recoil';
import { getRecoil } from 'recoil-nexus';
import { template, templateSettings } from 'lodash-es';
import { persistAtomWithDefault } from '@utils/recoilUtils';

type Local = 'en' | 'zh';
const localeState = atom<Local>({
  key: `localeState-vSwap-${import.meta.env.MODE}`,
  default: 'en',
  effects: [persistAtomWithDefault('en')],
});

export const useLocale = () => useRecoilValue(localeState);

const useI18n = <T extends Record<Local, Record<string, string>>>(transitions: T): T[Local] => {
  const locale = useLocale();
  return transitions[locale];
};

templateSettings.interpolate = /{([\s\S]+?)}/g;
export const compiled = (str: string, params: Record<string, string>) => template(str)(params);

export const toI18n = <T extends Record<Local, Record<string, string>>>(transitions: T): T[Local] => {
  const locale = getRecoil(localeState);
  return transitions[locale];
};

export default useI18n;
