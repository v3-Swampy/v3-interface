import { atom, useRecoilValue } from "recoil";
import { setRecoil } from "recoil-nexus";

export enum UserActiveStatus {
  Active,
  Inactive,
}

const userActiveStatus = atom<UserActiveStatus>({
  key: "userActiveStatus",
  default: UserActiveStatus.Active
});

export const useUserActiveStatus = () => useRecoilValue(userActiveStatus);

(function () {
  globalThis.addEventListener('focus', () => {
    setRecoil(userActiveStatus, UserActiveStatus.Active);
  });

  globalThis.addEventListener('blur', () => {
    setRecoil(userActiveStatus, UserActiveStatus.Inactive);
  });
}());