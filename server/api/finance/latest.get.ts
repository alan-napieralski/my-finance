import { financeStore } from '../../utils/financeStore'

export default eventHandler(async () => {
  const latest = financeStore.getLatest()

  if (!latest) {
    // Seed a sample entry only in dev environment
    if (process.env.NODE_ENV === 'development') {
      const seeded = financeStore.add({ seeded: true, amount: 1000 })
      return seeded
    }
    return null
  }

  return latest
})
