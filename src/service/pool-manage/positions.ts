import { selector, useRecoilValue } from 'recoil';
import { NonfungiblePositionManager, fetchMulticall } from '@contracts/index';
import { useAccount, accountState } from '@service/account';
import { fetchChain } from '@utils/fetch';

const positionBalanceQuery = selector({
  key: `positionBalanceQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    if (!account) return undefined;
    const response = await fetchChain<string>({
      params: [
        {
          data: NonfungiblePositionManager.func.encodeFunctionData('balanceOf', [account]),
          to: NonfungiblePositionManager.address,
        },
        'latest',
      ],
    });

    const positionBalance = NonfungiblePositionManager.func.decodeFunctionResult('balanceOf', response)?.[0];
    return positionBalance ? Number(positionBalance) : 0;
  },
});

const tokenIdsQuery = selector<Array<number> | undefined>({
  key: `tokenIdsQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    const positionBalance = get(positionBalanceQuery);
    if (!account || !positionBalance) return undefined;

    const tokenIdsArgs = account && positionBalance && positionBalance > 0 ? Array.from({ length: positionBalance }, (_, index) => [account, index]) : [];
    const tokenIdResults = await fetchMulticall(
      tokenIdsArgs.map((args) => [NonfungiblePositionManager.address, NonfungiblePositionManager.func.encodeFunctionData('tokenOfOwnerByIndex', args)])
    );
    if (Array.isArray(tokenIdResults))
      return tokenIdResults?.map((singleRes) => Number(NonfungiblePositionManager.func.decodeFunctionResult('tokenOfOwnerByIndex', singleRes)?.[0]));
    return [];
  },
});

const positionsQuery = selector({
  key: `PositionListQuery-${import.meta.env.MODE}`,
  get: async ({ get }) => {
    const account = get(accountState);
    const tokenIds = get(tokenIdsQuery);
    if (!account || !tokenIds?.length) return undefined;

    const positionsResult = await fetchMulticall(tokenIds.map((id) => [NonfungiblePositionManager.address, NonfungiblePositionManager.func.encodeFunctionData('positions', [id])]));

    if (Array.isArray(positionsResult)) return positionsResult?.map((singleRes) => NonfungiblePositionManager.func.decodeFunctionResult('positions', singleRes));
    return [];
  },
});

export const usePositionBalance = () => useRecoilValue(positionBalanceQuery);

export const useTokenIds = () => useRecoilValue(tokenIdsQuery);

export const usePositions = () => useRecoilValue(positionsQuery);
