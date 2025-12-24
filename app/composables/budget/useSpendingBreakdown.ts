import { endOfMonth, format, startOfMonth } from 'date-fns'
import type { ComputedRef } from 'vue'
import type { MainCategorySummary, SubcategorySummary, Transaction } from '~/types'
import { getMainCategory, mainCategories } from '~/utils/budgetCategories'

type DateRange = {
  start: Date
  end: Date
}

type UseSpendingBreakdownParams = {
  transactions: ComputedRef<Transaction[]>
  monthId: ComputedRef<string>
  previousMonthId: ComputedRef<string>
}

/**
 * Derives the start and end Date objects for a given month.
 *
 * Note: monthId must be in the `YYYY-MM` format. Callers are expected
 * to validate this (e.g. via monthIdSchema in useBudgetMonthTabs) before
 * passing it here.
 */
const resolveCategoryKey = (value: string): string => {
  const key = value.trim().toLowerCase()
  return key || 'uncategorized'
}

const getMonthRange = (monthId: string): DateRange => {
  const start = startOfMonth(new Date(`${monthId}-01T00:00:00`))
  const end = endOfMonth(start)
  return { start, end }
}

export function useSpendingBreakdown({ transactions, monthId, previousMonthId }: UseSpendingBreakdownParams) {
  const monthRange = computed(() => getMonthRange(monthId.value))
  const previousMonthRange = computed(() => getMonthRange(previousMonthId.value))

  const monthTransactions = computed(() => {
    return transactions.value.filter((tx) => {
      return tx.date >= monthRange.value.start && tx.date <= monthRange.value.end
    })
  })

  const actualIncome = computed(() => {
    return monthTransactions.value.reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0), 0)
  })

  const actualSpent = computed(() => {
    return monthTransactions.value.reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0)
  })

  const actualNet = computed(() => actualIncome.value - actualSpent.value)

  const buildActualByCategoryForRange = (range: DateRange) => {
    const buckets = new Map<string, number>()

    for (const tx of transactions.value) {
      if (tx.date < range.start || tx.date > range.end) continue

      const spent = tx.amount < 0 ? Math.abs(tx.amount) : 0
      if (!spent) continue

      const key = resolveCategoryKey(tx.category)
      const previous = buckets.get(key) ?? 0
      buckets.set(key, previous + spent)
    }

    return buckets
  }

  const actualByCategoryMap = computed(() => buildActualByCategoryForRange(monthRange.value))
  const previousMonthActualByCategory = computed(() => buildActualByCategoryForRange(previousMonthRange.value))

  const subcategoryBreakdown = computed<SubcategorySummary[]>(() => {
    const keys = new Set<string>()

    for (const key of actualByCategoryMap.value.keys()) keys.add(key)
    for (const key of previousMonthActualByCategory.value.keys()) keys.add(key)

    return Array.from(keys)
      .map((key) => {
        const actual = actualByCategoryMap.value.get(key) ?? 0
        const previousMonth = previousMonthActualByCategory.value.get(key) ?? 0
        const momChange = actual - previousMonth

        let momChangePercent: number | null = null
        if (previousMonth > 0) {
          momChangePercent = Math.round((momChange / previousMonth) * 100)
        }

        return {
          subcategory: key,
          mainCategory: getMainCategory(key),
          actual,
          previousMonth,
          momChange,
          momChangePercent
        }
      })
      .sort((a, b) => b.actual - a.actual)
  })

  const mainCategoryBreakdown = computed<MainCategorySummary[]>(() => {
    return mainCategories.map((mainCategory) => {
      const actual = subcategoryBreakdown.value
        .filter(s => s.mainCategory === mainCategory)
        .reduce((sum, s) => sum + s.actual, 0)

      const previousMonth = subcategoryBreakdown.value
        .filter(s => s.mainCategory === mainCategory)
        .reduce((sum, s) => sum + s.previousMonth, 0)

      const momChange = actual - previousMonth

      let momChangePercent: number | null = null
      if (previousMonth > 0) {
        momChangePercent = Math.round((momChange / previousMonth) * 100)
      }

      return {
        mainCategory,
        actual,
        previousMonth,
        momChange,
        momChangePercent
      }
    })
  })

  const monthTitle = computed(() => format(new Date(`${monthId.value}-01T00:00:00`), 'MMM yyyy'))

  return {
    monthRange,
    previousMonthRange,
    monthTransactions,
    actualIncome,
    actualSpent,
    actualNet,
    subcategoryBreakdown,
    mainCategoryBreakdown,
    monthTitle
  }
}
