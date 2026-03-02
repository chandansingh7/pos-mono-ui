/**
 * Formats a numeric amount as currency for display (e.g. in printed receipts).
 * Uses Intl.NumberFormat with the given currency code and optional locale.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  locale?: string
): string {
  const loc = locale && locale.trim() ? locale : 'en-US';
  try {
    return new Intl.NumberFormat(loc, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${currencyCode} ${Number(amount).toFixed(2)}`;
  }
}
