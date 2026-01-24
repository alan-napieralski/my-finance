import { format } from 'date-fns'
import type { FetchTransactionsOptions, Range, TransactionsResponse } from '~/types'

export const DEFAULT_TRANSACTIONS_LIMIT = 20000

export function useTransactionsApi() {
  const isValidDate = (value: unknown): value is Date => {
    return value instanceof Date && !Number.isNaN(value.getTime())
  }

  const fetchTransactions = async (range: Range, options: FetchTransactionsOptions = {}): Promise<TransactionsResponse> => {
    if (!isValidDate(range.start) || !isValidDate(range.end) || range.start.getTime() > range.end.getTime()) {
      throw new Error('Invalid transaction range: start must be a valid date ≤ end')
    }

    const limit = options.limit ?? DEFAULT_TRANSACTIONS_LIMIT

    return await apiFetch<TransactionsResponse>('/api/transactions', {
      query: {
        start: format(range.start, 'yyyy-MM-dd'),
        end: format(range.end, 'yyyy-MM-dd'),
        limit,
        ...(options.sourceSystem ? { source_system: options.sourceSystem } : {}),
        ...(options.sourceAccount ? { source_account: options.sourceAccount } : {})
      }
    })
  }

  return {
    fetchTransactions
  }
}
