import { parse } from 'date-fns'

/**
 * Parses a transaction date string.
 * Assumes DD/MM/YYYY format for slash-separated dates (UK standard).
 * Falls back to ISO date parsing.
 *
 * @param value - The date string to parse
 * @returns Parsed Date object or null if parsing fails
 */
export function parseTransactionDate(value: string): Date | null {
  if (!value) {
    return null
  }

  // Try DD/MM/YYYY format first (UK standard)
  const parsed = parse(value, 'dd/MM/yyyy', new Date())
  if (!Number.isNaN(parsed.getTime())) {
    return parsed
  }

  // Fall back to ISO date or other standard formats
  const fallback = new Date(value)
  if (!Number.isNaN(fallback.getTime())) {
    return fallback
  }

  return null
}
