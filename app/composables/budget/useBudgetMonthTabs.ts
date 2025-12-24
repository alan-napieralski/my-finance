import { format, subMonths } from 'date-fns'
import type { TabsItem } from '#ui/types'
import { z } from 'zod'

type UseBudgetMonthTabsOptions = {
  monthsBack?: number
}

// Zod schema to validate YYYY-MM format
const monthIdSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

export function useBudgetMonthTabs(options: UseBudgetMonthTabsOptions = {}) {
  const monthsBack = options.monthsBack ?? 12

  const now = ref(new Date())

  const monthIds = computed(() => {
    return Array.from({ length: monthsBack }, (_, index) => {
      return format(subMonths(now.value, index), 'yyyy-MM')
    })
  })

  const monthTabItems = computed<TabsItem[]>(() => {
    return monthIds.value.map(monthId => ({
      label: format(new Date(`${monthId}-01T00:00:00`), 'MMM yyyy'),
      value: monthId
    }))
  })

  const selectedMonthId = ref<string>(format(now.value, 'yyyy-MM'))

  const validatedMonthId = computed(() => {
    const result = monthIdSchema.safeParse(selectedMonthId.value)
    if (!result.success) {
      console.error('[useBudgetMonthTabs] Invalid month ID format:', selectedMonthId.value)
      return format(now.value, 'yyyy-MM')
    }
    return result.data
  })

  const previousMonthDate = computed(() => subMonths(new Date(`${validatedMonthId.value}-01T00:00:00`), 1))
  const previousMonthId = computed(() => format(previousMonthDate.value, 'yyyy-MM'))
  const previousMonthLabel = computed(() => format(previousMonthDate.value, 'MMM'))

  const refreshNow = () => {
    now.value = new Date()
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      refreshNow()
    }
  }

  onMounted(() => {
    if (import.meta.client) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
  })

  onUnmounted(() => {
    if (import.meta.client) {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  })

  return {
    now,
    monthIds,
    monthTabItems,
    selectedMonthId,
    validatedMonthId,
    previousMonthId,
    previousMonthLabel,
    refreshNow
  }
}
