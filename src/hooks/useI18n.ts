import { atom, useRecoilValue } from 'recoil';
import { template, templateSettings } from 'lodash-es';
import LocalStorage from 'localstorage-enhance';

type Local = 'en' | 'zh';
const localeState = atom<Local>({
  key: 'localeState',
  default: (LocalStorage.getItem('locale') as Local) ?? 'en',
});

export const useLocale = () => useRecoilValue(localeState);

const useI18n = <T extends Record<Local, Record<string, string>>>(transitions: T): T[Local] => {
  const locale = useLocale();
  return transitions[locale];
};

templateSettings.interpolate = /{([\s\S]+?)}/g;
export const compiled = (str: string, params: Record<string, string>) => template(str)(params);

export default useI18n;
