import { endOfMonth, startOfMonth } from 'date-fns'

export type DateRange = {
  start: Date
  end: Date
}

/**
 * Returns the start/end range for a given month.
 *
 * Note: monthId must be in `YYYY-MM` format (callers should validate).
 */
export const getMonthRange = (monthId: string): DateRange => {
  const start = startOfMonth(new Date(`${monthId}-01T00:00:00`))
  const end = endOfMonth(start)
  return { start, end }
}
