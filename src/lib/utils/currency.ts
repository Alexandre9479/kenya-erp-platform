/**
 * Currency formatting utilities for Kenya ERP Platform.
 * Default currency: KES (KSh)
 */

export function formatCurrency(
  amount: number,
  currency = "KES",
  locale = "en-KE"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format as KSh 1,234.56 (short form used in tables)
 */
export function formatKES(amount: number): string {
  return `KSh ${new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

/**
 * Parse a currency string back to a number.
 */
export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^0-9.-]/g, "")) || 0;
}

/**
 * Format a number with commas (no currency symbol).
 */
export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-KE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Calculate VAT amount.
 */
export function calculateVAT(amount: number, vatRate: number): number {
  return Number((amount * (vatRate / 100)).toFixed(2));
}

/**
 * Round to 2 decimal places.
 */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
