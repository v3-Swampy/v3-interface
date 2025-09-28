import { Unit } from '@cfxjs/use-wallet-react/ethereum';

const ALLOWED_PRICE_IMPACT_LOW = new Unit(0.01); // 1%
const ALLOWED_PRICE_IMPACT_MEDIUM = new Unit(0.03); // 3%
const ALLOWED_PRICE_IMPACT_HIGH = new Unit(0.05); // 5%
// if the price slippage exceeds this number, force the user to type 'confirm' to execute
const PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN = new Unit(0.1); // 10%
// for non expert mode disable swaps above this
const BLOCKED_PRICE_IMPACT_NON_EXPERT = new Unit(0.15); // 15%

export type WarningSeverity = 0 | 1 | 2 | 3 | 4;
const IMPACT_TIERS = [BLOCKED_PRICE_IMPACT_NON_EXPERT, ALLOWED_PRICE_IMPACT_HIGH, ALLOWED_PRICE_IMPACT_MEDIUM, ALLOWED_PRICE_IMPACT_LOW];

export function warningSeverity(priceImpact: Unit | undefined): WarningSeverity {
  if (!priceImpact) return 0;
  // This function is used to calculate the Severity level for % changes in USD value and Price Impact.
  // Price Impact is always an absolute value (conceptually always negative, but represented in code with a positive value)
  // The USD value change can be positive or negative, and it follows the same standard as Price Impact (positive value is the typical case of a loss due to slippage).
  // We don't want to return a warning level for a favorable/profitable change, so when the USD value change is negative we return 0.
  if (priceImpact.lessThan(0)) return 0;
  let impact: WarningSeverity = IMPACT_TIERS.length as WarningSeverity;
  for (const impactLevel of IMPACT_TIERS) {
    if (impactLevel.lessThan(priceImpact)) return impact;
    impact--;
  }
  return 0;
}

export function getPriceImpactWarning(priceImpact: Unit): 'warning' | 'error' | undefined {
  if (priceImpact.greaterThan(ALLOWED_PRICE_IMPACT_HIGH)) return 'error';
  if (priceImpact.greaterThan(ALLOWED_PRICE_IMPACT_MEDIUM)) return 'warning';
  return;
}


/**
 * Given the price impact, get user confirmation.
 *
 * @param priceImpactWithoutFee price impact of the trade without the fee.
 */
export function confirmPriceImpactWithoutFee(priceImpactWithoutFee: Unit): boolean {
  if (!priceImpactWithoutFee.lessThan(PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN)) {
    return (
      window.prompt(
        `This swap has a price impact of at least ${PRICE_IMPACT_WITHOUT_FEE_CONFIRM_MIN.toDecimalMinUnit()}%. Please type the word "confirm" to continue with this swap.`
      ) === 'confirm'
    );
  } else if (!priceImpactWithoutFee.lessThan(ALLOWED_PRICE_IMPACT_HIGH)) {
    return window.confirm(
      `This swap has a price impact of at least ${ALLOWED_PRICE_IMPACT_HIGH.toDecimalMinUnit()}%. Please confirm that you would like to continue with this swap.`
    );
  }
  return true;
}

export function computeFiatValuePriceImpact(
  sourceTokenUSDPrice: string | undefined | null,
  destinationTokenUSDPrice: string | undefined | null
): Unit | undefined {
  if (!sourceTokenUSDPrice || !destinationTokenUSDPrice) return undefined
  if (new Unit(sourceTokenUSDPrice).equals(0)) return undefined

  const ratio = new Unit(1).sub(new Unit(destinationTokenUSDPrice).div(new Unit(sourceTokenUSDPrice)));
  const numerator = ratio.mul(10000).toDecimalMinUnit(0);
  return new Unit(numerator).div(10000);
}
