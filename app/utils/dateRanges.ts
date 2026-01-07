import type { Range } from '~/types'
import { monthIdSchema } from '~/schemas/budget'

/**
 * Returns the UTC start/end range for a given monthId (YYYY-MM).
 */
export const getMonthRange = (monthId: string): Range => {
  const result = monthIdSchema.safeParse(monthId)
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? result.error.message
    throw new Error(`[dateRanges] Invalid monthId: ${String(monthId)}. ${message}`)
  }

  const [yearRaw, monthRaw] = result.data.split('-')

  const year = Number(yearRaw)
  const monthIndex = Number(monthRaw) - 1

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0))
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999))

  return { start, end }
}
