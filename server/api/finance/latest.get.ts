import { financeStore } from '../../utils/financeStore'

export default eventHandler(async () => {
  const latest = financeStore.getLatest()

  if (!latest) {
    // Seed a sample entry for dev environment
    const seeded = financeStore.add({ seeded: true, amount: 1000 })
    return seeded
  }

  return latest
})
