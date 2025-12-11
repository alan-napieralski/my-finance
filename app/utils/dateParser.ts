import { parse } from 'date-fns'

/**
 * Parses a transaction date string with disambiguation to prevent misinterpretation.
 * 
 * For slash-separated numeric dates (e.g., "01/02/2024"):
 * - If both first and second tokens are <=12, the date is ambiguous and returns null
 * - If day > 12, assumes dd/MM/yyyy format
 * - If month > 12, assumes MM/dd/yyyy format
 * - Falls back to ISO date parsing for unambiguous cases
 * 
 * @param value - The date string to parse
 * @returns Parsed Date object or null if parsing fails or date is ambiguous
 */
export function parseTransactionDate(value: string): Date | null {
  if (!value) {
    return null
  }

  // Check if it's a slash-separated numeric date (e.g., "01/02/2024")
  const slashDateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
  const match = value.match(slashDateRegex)

  if (match) {
    const first = Number.parseInt(match[1]!, 10)
    const second = Number.parseInt(match[2]!, 10)

    // Both tokens <=12 means ambiguous (could be either dd/MM or MM/dd)
    if (first <= 12 && second <= 12) {
      console.warn(`[dateParser] Ambiguous date format: "${value}". Both day and month are <=12. Returning null.`)
      return null
    }

    // If first token > 12, it must be day, so format is dd/MM/yyyy
    if (first > 12) {
      const parsed = parse(value, 'dd/MM/yyyy', new Date())
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }

    // If second token > 12, it must be day, so format is MM/dd/yyyy
    if (second > 12) {
      const parsed = parse(value, 'MM/dd/yyyy', new Date())
      if (!Number.isNaN(parsed.getTime())) {
        return parsed
      }
    }
  }

  // Try parsing as ISO date or other standard formats
  const fallback = new Date(value)
  if (!Number.isNaN(fallback.getTime())) {
    return fallback
  }

  return null
}
