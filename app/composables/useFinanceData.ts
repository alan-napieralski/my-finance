import type { FinanceEntry } from '~/types'

type FetchResult<T> = { data: T, error: null } | { data: null, error: unknown }

export const useFinanceData = () => {
  // Fetch latest finance data
  const fetchLatest = async (): Promise<FetchResult<FinanceEntry | null>> => {
    try {
      const data = await $fetch<FinanceEntry | null>('/api/finance/latest')
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
    const result = useFetch<FinanceEntry | null>('/api/finance/latest', {
      watch: false,
      server: false
    })

    if (refreshInterval > 0) {
      let intervalId: ReturnType<typeof setInterval> | null = null

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
