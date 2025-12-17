/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_ESpaceRpcUrl: string;
  readonly VITE_ESpaceScanUrl: string;
  readonly VITE_FarmingConfigUrl: string;
  readonly VITE_TokenListConfigUrl: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

type OverWrite<T, U> = Omit<T, keyof U> & U;
type PartialOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type PartialOmit<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>;
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

declare module 'custom-react-scrollbar' {
  const CustomScrollbar: any;
  export default CustomScrollbar;
}
