import JSBI from 'jsbi'
import { Percent } from '@uniswap/sdk-core'

// one basis JSBI.BigInt
export const BIPS_BASE = JSBI.BigInt(10000)
export const BETTER_TRADE_LESS_HOPS_THRESHOLD = new Percent(JSBI.BigInt(50), 10000)
export const ONE_HUNDRED_PERCENT = new Percent('1')
export const ZERO_PERCENT = new Percent('0')
export const MINIMUM_LIQUIDITY = JSBI.BigInt(1000)
export const _9975 = JSBI.BigInt(9975)
export const _10000 = JSBI.BigInt(10000)
export const ZERO = JSBI.BigInt(0)
export const ONE = JSBI.BigInt(1)
export const FIVE = JSBI.BigInt(5)