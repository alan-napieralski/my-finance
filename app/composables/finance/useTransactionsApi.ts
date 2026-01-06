import { format } from 'date-fns'
import type { FetchTransactionsOptions, Range, TransactionsResponse } from '~/types'

export const DEFAULT_TRANSACTIONS_LIMIT = 20000

export function useTransactionsApi() {
  const fetchTransactions = async (range: Range, options: FetchTransactionsOptions = {}): Promise<TransactionsResponse> => {
    const limit = options.limit ?? DEFAULT_TRANSACTIONS_LIMIT

    return await $fetch<TransactionsResponse>('/api/transactions', {
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
