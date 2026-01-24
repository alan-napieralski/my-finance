import type { FetchResult, FinanceEntry } from '~/types'

export const useFinanceData = () => {
  // Fetch latest finance data
  const fetchLatest = async (): Promise<FetchResult<FinanceEntry | null>> => {
    try {
      const data = await apiFetch<FinanceEntry | null>('/api/finance/latest')
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  type FinanceEntriesResponse = { count: number, data: FinanceEntry[] }

  // Fetch all finance data with optional limit
  const fetchAll = async (limit = 50): Promise<FetchResult<FinanceEntriesResponse>> => {
    try {
      const data = await apiFetch<FinanceEntriesResponse>('/api/finance', { query: { limit } })
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err }
    }
  }

  // Auto-refreshing latest data (for real-time updates)
  const useLatestData = (refreshInterval = 10000) => {
    const baseURL = getApiBaseUrl()

    const result = useFetch<FinanceEntry | null>('/api/finance/latest', {
      baseURL,
      credentials: 'include',
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
