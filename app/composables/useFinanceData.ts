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
    const result = useFetch('/api/finance/latest', {
      watch: false,
      server: false
    })

    if (refreshInterval > 0) {
      let intervalId: NodeJS.Timeout | null = null

      onMounted(() => {
        intervalId = setInterval(() => {
          result.refresh()
        }, refreshInterval)
      })

      onUnmounted(() => {
        if (intervalId !== null) {
          clearInterval(intervalId)
          intervalId = null
        }
      })
    }

    return result
  }

  return {
    fetchLatest,
    fetchAll,
    useLatestData
  }
}
