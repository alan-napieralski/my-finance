import { financeStore } from '../../utils/financeStore'
import { transactionPayloadMock } from '~~/server/models/mockTransactionData'

const toNegativeAmount = (value: unknown): unknown => {
  if (typeof value === 'number') {
    return -Math.abs(value)
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return String(-Math.abs(parsed))
    }
  }

  return value
}

export default eventHandler(async () => {
  const latest = financeStore.getLatest()

  if (!latest) {
    // Provide a consistent shape for the frontend.
    // Only use mock data in development.
    if (process.env.NODE_ENV === 'development') {
      const today = new Date().toISOString().slice(0, 10)

      return {
        id: 'mock',
        timestamp: new Date().toISOString(),
        data: {
          transactions: [
            {
              id: 'mock-income-1',
              date: today,
              amount: 5000,
              category: 'income',
              description: 'Salary'
            },
            ...transactionPayloadMock.map(tx => ({
              ...tx,
              amount: toNegativeAmount(tx.amount)
            }))
          ]
        }
      }
    }

    return null
  }

  return latest
})
