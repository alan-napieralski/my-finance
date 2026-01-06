import type { ComputedRef } from 'vue'
import type { MainCategory, MainCategorySummary, Range, SubcategorySummary, Transaction } from '~/types'
import { monthIdSchema } from '~/types/budget'
import { getMainCategory, mainCategories } from '~/utils/budgetCategories'
import { getMonthRange } from '~/utils/dateRanges'

type UseSpendingBreakdownParams = {
  transactions: ComputedRef<Transaction[]>
  monthId: ComputedRef<string>
  previousMonthId: ComputedRef<string>
}

const resolveCategoryKey = (value: string): string => {
  const key = value.trim().toLowerCase()
  return key || 'uncategorized'
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

  const buildActualByCategoryForRange = (range: Range) => {
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

  const totalsByMainCategory = computed(() => {
    const totals = new Map<MainCategory, { actual: number, previousMonth: number }>()

    for (const mainCategory of mainCategories) {
      totals.set(mainCategory, { actual: 0, previousMonth: 0 })
    }

    for (const row of subcategoryBreakdown.value) {
      const entry = totals.get(row.mainCategory)
      if (!entry) continue
      entry.actual += row.actual
      entry.previousMonth += row.previousMonth
    }

    return totals
  })

  const mainCategoryBreakdown = computed<MainCategorySummary[]>(() => {
    return mainCategories.map((mainCategory) => {
      const totals = totalsByMainCategory.value.get(mainCategory) ?? { actual: 0, previousMonth: 0 }
      const momChange = totals.actual - totals.previousMonth

      let momChangePercent: number | null = null
      if (totals.previousMonth > 0) {
        momChangePercent = Math.round((momChange / totals.previousMonth) * 100)
      }

      return {
        mainCategory,
        actual: totals.actual,
        previousMonth: totals.previousMonth,
        momChange,
        momChangePercent
      }
    })
  })

  const monthTitle = computed(() => {
    const validated = monthIdSchema.parse(monthId.value)
    const [yearRaw, monthRaw] = validated.split('-')
    const year = Number(yearRaw)
    const monthIndex = Number(monthRaw) - 1

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthLabel = labels[monthIndex] ?? String(monthRaw)

    return `${monthLabel} ${year}`
  })

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
