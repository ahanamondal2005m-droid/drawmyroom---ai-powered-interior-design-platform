/**
 * Shared display formatting helpers.
 */

/**
 * Currency symbol for budget displays.
 *
 * Mirrors the previous per-component ternary exactly: INR renders as '₹' and
 * every other currency code renders as '$'. (EUR/GBP can be selected in
 * Settings but intentionally keep the legacy '$' display; changing that is a
 * product decision, not a refactor.)
 */
export function currencySymbolFor(currency: string | undefined): string {
  return currency === 'INR' ? '₹' : '$';
}
