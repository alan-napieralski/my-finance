import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { BudgetMonth, IncomeLine, BudgetItem } from '~/types'

type BudgetMonthMap = Record<string, BudgetMonth>

const emptyMonth = (monthId: string): BudgetMonth => ({
  monthId,
  income: [{ id: crypto.randomUUID(), name: 'Salary', amount: 0 }],
  items: []
})

const toAmount = (value: unknown): number => {
  const amount = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
  return Number.isFinite(amount) ? amount : 0
}

export const useBudgetStore = defineStore('budget', () => {
  const months = useStorage<BudgetMonthMap>('budget:months', {})

  const getMonth = (monthId: string) => {
    if (!months.value[monthId]) {
      months.value[monthId] = emptyMonth(monthId)
    }

    return months.value[monthId]!
  }

  const ensureMonth = (monthId: string) => {
    getMonth(monthId)
  }

  const plannedIncomeTotal = (monthId: string) => computed(() => {
    const month = getMonth(monthId)
    return month.income.reduce((sum, line) => sum + (line.amount || 0), 0)
  })

  const plannedSpendingItemsTotal = (monthId: string) => computed(() => {
    const month = getMonth(monthId)
    return month.items.reduce((sum, item) => sum + (item.plannedAmount || 0), 0)
  })

  const plannedSavingsOverride = (monthId: string) => computed(() => {
    const month = getMonth(monthId)
    return month.plannedSavingsOverride
  })

  function setPlannedSavingsOverride(monthId: string, value: number | null) {
    const month = getMonth(monthId)

    if (value === null) {
      month.plannedSavingsOverride = undefined
      return
    }

    const amount = toAmount(value)
    month.plannedSavingsOverride = Math.max(0, amount)
  }

  function addIncomeLine(monthId: string) {
    const month = getMonth(monthId)
    month.income.push({ id: crypto.randomUUID(), name: '', amount: 0 })
  }

  function updateIncomeLine(monthId: string, id: string, patch: Partial<IncomeLine>) {
    const month = getMonth(monthId)
    const index = month.income.findIndex(line => line.id === id)
    if (index === -1) return

    Object.assign(month.income[index]!, patch)
  }

  function removeIncomeLine(monthId: string, id: string) {
    const month = getMonth(monthId)
    month.income = month.income.filter(line => line.id !== id)

    if (!month.income.length) {
      month.income.push({ id: crypto.randomUUID(), name: '', amount: 0 })
    }
  }

  function addBudgetItem(monthId: string) {
    const month = getMonth(monthId)
    month.items.push({ id: crypto.randomUUID(), name: '', category: 'Uncategorized', plannedAmount: 0 })
  }

  function updateBudgetItem(monthId: string, id: string, patch: Partial<BudgetItem>) {
    const month = getMonth(monthId)
    const index = month.items.findIndex(item => item.id === id)
    if (index === -1) return

    Object.assign(month.items[index]!, patch)
  }

  function removeBudgetItem(monthId: string, id: string) {
    const month = getMonth(monthId)
    month.items = month.items.filter(item => item.id !== id)
  }

  function clearMonth(monthId: string) {
    const { [monthId]: _removed, ...rest } = months.value
    months.value = rest
  }

  return {
    months,
    ensureMonth,
    getMonth,
    plannedIncomeTotal,
    plannedSpendingItemsTotal,
    plannedSavingsOverride,
    setPlannedSavingsOverride,
    addIncomeLine,
    updateIncomeLine,
    removeIncomeLine,
    addBudgetItem,
    updateBudgetItem,
    removeBudgetItem,
    clearMonth
  }
})
