import type { FinanceEntry } from '~/types'

type UseFinanceLatestEntryOptions = {
  watch?: Array<() => unknown>
  default?: () => FinanceEntry | null
}

export function useFinanceLatestEntry(
  key: string = 'finance-latest',
  options: UseFinanceLatestEntryOptions = {}
) {
  const { default: defaultValue, ...rest } = options
  const remote = isRemoteApiEnabled()

  return useAsyncData<FinanceEntry | null>(key, async () => {
    return await apiFetch<FinanceEntry | null>('/api/finance/latest')
  }, {
    default: defaultValue ?? (() => null),
    ...rest,
    ...(remote ? { server: false } : {})
  })
}
