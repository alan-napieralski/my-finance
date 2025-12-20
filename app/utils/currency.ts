export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return formatCurrency(0)
  }
  return value.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  })
}
