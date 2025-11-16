import { financeStore } from '../../utils/financeStore'

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const limit = query.limit ? parseInt(query.limit as string) : 50

  const data = financeStore.getAll(limit)

  return {
    count: data.length,
    data
  }
})
