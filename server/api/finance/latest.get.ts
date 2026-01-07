import { financeStore } from '../../utils/financeStore'
import { buildMockFinanceTransactions } from '~~/server/models/mockTransactionData'

export default eventHandler(async () => {
  const latest = financeStore.getLatest()

  if (!latest) {
    const isProduction = process.env.NODE_ENV === 'production'
    const useMock
      = !isProduction
        && (process.env.MY_FINANCE_USE_MOCK_DATA === 'true' || import.meta.dev)

    // Provide a consistent shape for the frontend.
    // Never use mock data in production.
    if (useMock) {
      return {
        id: 'mock',
        timestamp: new Date().toISOString(),
        data: {
          transactions: buildMockFinanceTransactions()
        }
      }
    }

    return null
  }

  return latest
})
