import { financeStore } from '../../utils/financeStore'

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const rawLimit = Array.isArray(query.limit) ? query.limit[0] : query.limit
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : NaN
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 100) // 1–100, aligned with store capacity
    : 50

  const data = financeStore.getAll(limit)

  return {
    count: data.length,
    data
  }
})
