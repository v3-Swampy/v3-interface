import dayjs from 'dayjs';
import { NonfungiblePositionManager } from '@contracts/index';
import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { getTransactionDeadline } from '@service/settings';
import { getAccount, sendTransaction } from '@service/account';

const duration = dayjs.duration;

export const removeLiquidity = async ({ tokenId, positionLiquidity, removePercent }: { tokenId: string; positionLiquidity: string; removePercent: number }) => {
  try {
    const account = getAccount();
    if (!account) return;
    const deadline = dayjs().add(duration(getTransactionDeadline(), 'minute')).unix();
    const liquidity = new Unit(positionLiquidity).mul(removePercent).div(100).toDecimalMinUnit(0);

    console.log('liquidity', liquidity);
    const params = {
      tokenId: new Unit(tokenId).toHexMinUnit(),
      liquidity: new Unit(liquidity).toHexMinUnit(),
      amount0Min: 0,
      amount1Min: 0,
      deadline,
    };
    const data = NonfungiblePositionManager.func.interface.encodeFunctionData('decreaseLiquidity', [
      {
        ...params,
      },
    ]);
    const txHash = await sendTransaction({ value: '0x0', to: NonfungiblePositionManager.address, data });
    console.log('txHash', txHash);
    return txHash;
  } catch (err) {
    console.error(err);
  }
};
