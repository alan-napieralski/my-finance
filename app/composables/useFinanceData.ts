export const useFinanceData = () => {
  // Fetch latest finance data
  const fetchLatest = async () => {
    const { data, error } = await useFetch('/api/finance/latest')
    return { data: data.value, error: error.value }
  }

  // Fetch all finance data with optional limit
  const fetchAll = async (limit = 50) => {
    const { data, error } = await useFetch(`/api/finance?limit=${limit}`)
    return { data: data.value, error: error.value }
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
