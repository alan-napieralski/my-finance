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

  return useAsyncData<FinanceEntry | null>(key, async () => {
    return await $fetch<FinanceEntry>('/api/finance/latest')
  }, {
    default: defaultValue ?? (() => null),
    ...rest
  })
}
