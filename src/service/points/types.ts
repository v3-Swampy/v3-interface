export interface UserData {
  account: string | undefined;
  wPoints: number | undefined;
  fPoints: number | undefined;
  ranking?: number;
}

export interface UserDataResponse {
  data: UserData[] | undefined;
  updatedAt: number;
}

export interface PoolData {
  address: string;
  token0Address: string;
  token1Address: string;
  wPoints: number;
  fPoints: number;
  tvl: number;
  fee: number;
}
