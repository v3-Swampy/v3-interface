import { Unit } from '@cfxjs/use-wallet-react/ethereum';
import { sendTransaction } from '@service/account';
import { UniswapV3Factory, createERC20Contract } from '@contracts/index';
import { TokenVST } from '@service/tokens';

// TODO: chaozhou
export const handleStakingVST = async ({ amount, durationSeconds }: { amount: string; durationSeconds: number }) => {
  const TokenVSTContract = createERC20Contract(TokenVST!.address);
  const hexTokenAmount = Unit.fromStandardUnit(amount, TokenVST!.decimals).toHexMinUnit();
  console.log(hexTokenAmount, durationSeconds);

  // test
  const txHash = await sendTransaction({
    value: Unit.fromStandardUnit('1', 18).toHexMinUnit(),
    to: '0x102e0fb8a5ED6E0f0899C3ed9896cb8973aA29bB',
  });
  // const txHash = await sendTransaction({
  //   data: UniswapV3Factory.func.encodeFunctionData('demo', [hexTokenAmount]),
  //   to: UniswapV3Factory.address,
  // });

  return txHash;
};
