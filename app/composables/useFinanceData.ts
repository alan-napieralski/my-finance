export const useFinanceData = () => {
  // Fetch latest finance data
  const fetchLatest = async () => {
    try {
      const data = await $fetch('/api/finance/latest')
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  // Fetch all finance data with optional limit
  const fetchAll = async (limit = 50) => {
    try {
      const data = await $fetch(`/api/finance`, { query: { limit } })
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  // Auto-refreshing latest data (for real-time updates)
  const useLatestData = (refreshInterval = 10000) => {
    return useFetch('/api/finance/latest', {
      watch: false,
      server: false,
      ...refreshInterval > 0 && {
        onResponse() {
          // Auto-refresh every X milliseconds
          setTimeout(() => {
            refresh()
          }, refreshInterval)
        }
      }
    })
  }

  return {
    fetchLatest,
    fetchAll,
    useLatestData
  }
}
