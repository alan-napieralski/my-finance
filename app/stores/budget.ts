import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { BudgetMonth, IncomeLine } from '~/types'

type BudgetMonthMap = Record<string, BudgetMonth>

const emptyMonth = (monthId: string): BudgetMonth => ({
  monthId,
  income: [{ id: crypto.randomUUID(), name: 'Salary', amount: 0 }]
})

const toAmount = (value: unknown): number => {
  const amount = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
  return Number.isFinite(amount) ? amount : 0
}

const validateMonthId = (monthId: string): void => {
  if (!/^\d{4}-\d{2}$/.test(monthId)) {
    throw new Error(`Invalid monthId format: ${monthId}. Expected YYYY-MM`)
  }
}

export const useBudgetStore = defineStore('budget', () => {
  const months = useStorage<BudgetMonthMap>('budget:months', {})

  const getMonth = (monthId: string): BudgetMonth | undefined => {
    validateMonthId(monthId)
    return months.value[monthId]
  }

  const getOrCreateMonth = (monthId: string): BudgetMonth => {
    validateMonthId(monthId)
    if (!months.value[monthId]) {
      months.value[monthId] = emptyMonth(monthId)
    }
    return months.value[monthId]!
  }

  const ensureMonth = (monthId: string): void => {
    getOrCreateMonth(monthId)
  }

  const plannedIncomeTotal = (monthId: string) => computed(() => {
    const month = getOrCreateMonth(monthId)
    return month.income.reduce((sum, line) => sum + (line.amount || 0), 0)
  })

  const plannedSavingsOverride = (monthId: string) => computed(() => {
    const month = getOrCreateMonth(monthId)
    return month.plannedSavingsOverride
  })

  function setPlannedSavingsOverride(monthId: string, value: number | null) {
    const month = getOrCreateMonth(monthId)

    if (value === null) {
      month.plannedSavingsOverride = undefined
      return
    }

    const amount = toAmount(value)
    month.plannedSavingsOverride = Math.max(0, amount)
  }

  function addIncomeLine(monthId: string) {
    const month = getOrCreateMonth(monthId)
    month.income.push({ id: crypto.randomUUID(), name: '', amount: 0 })
  }

  function updateIncomeLine(monthId: string, id: string, patch: Partial<IncomeLine>) {
    const month = getOrCreateMonth(monthId)
    const index = month.income.findIndex(line => line.id === id)
    if (index === -1) return

    // Sanitize amount to prevent NaN states
    if ('amount' in patch) {
      patch.amount = toAmount(patch.amount)
    }

    Object.assign(month.income[index]!, patch)
  }

  function removeIncomeLine(monthId: string, id: string) {
    const month = getOrCreateMonth(monthId)

    // Prevent removing the first income line (Salary)
    if (month.income[0]?.id === id) return

    month.income = month.income.filter(line => line.id !== id)
  }

  function clearMonth(monthId: string) {
    validateMonthId(monthId)
    const { [monthId]: _removed, ...rest } = months.value
    months.value = rest
  }

  return {
    months,
    // Accessors
    getMonth,
    getOrCreateMonth,
    ensureMonth,
    // Computed helpers
    plannedIncomeTotal,
    plannedSavingsOverride,
    // Mutations
    setPlannedSavingsOverride,
    addIncomeLine,
    updateIncomeLine,
    removeIncomeLine,
    clearMonth
  }
})
