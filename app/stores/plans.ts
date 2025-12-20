import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { GeneralSavings, WantPlan, DebtPlan, RecurringPayment } from '~/types'

const toNonNegativeNumber = (value: unknown): number => {
  const amount = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
  return Number.isFinite(amount) ? Math.max(0, amount) : 0
}

const toPositiveIntegerOrNull = (value: unknown): number | null => {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null
}

const deriveMonthsToTargetFromDate = (targetDate: string): number | null => {
  // Expected format: YYYY-MM-DD
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(targetDate)
  if (!match) return null

  const target = new Date(`${targetDate}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null

  const now = new Date()
  const nowIndex = now.getFullYear() * 12 + now.getMonth()
  const targetIndex = target.getFullYear() * 12 + target.getMonth()

  return Math.max(1, targetIndex - nowIndex)
}

export const usePlansStore = defineStore('plans', () => {
  const savings = useStorage<GeneralSavings>('plans:savings-general', {
    monthlyAmount: 0
  })

  const wants = useStorage<WantPlan[]>('plans:wants', [])
  const debts = useStorage<DebtPlan[]>('plans:debts', [])
  const recurringPayments = useStorage<RecurringPayment[]>('plans:recurring', [])

  // Normalize stored wants (non-destructive; keeps legacy fields)
  wants.value = wants.value.map((want) => {
    const monthlyAmount = toNonNegativeNumber(want.monthlyAmount)

    // Only derive months from legacy targetDate when the want is otherwise "calculation-based"
    // (i.e., no manual monthly amount set).
    const derivedMonths = want.targetDate && monthlyAmount === 0
      ? deriveMonthsToTargetFromDate(want.targetDate)
      : null

    return {
      ...want,
      monthlyAmount,
      targetAmount: want.targetAmount == null ? undefined : toNonNegativeNumber(want.targetAmount),
      monthsToTarget: want.monthsToTarget == null ? (derivedMonths ?? undefined) : (toPositiveIntegerOrNull(want.monthsToTarget) ?? undefined),
      invested: Boolean(want.invested)
    }
  })

  const totalSavingsPerMonth = computed(() => savings.value.monthlyAmount ?? 0)

  const getWantMonthlyAmount = (want: WantPlan): number => {
    const manual = toNonNegativeNumber(want.monthlyAmount)

    const targetAmount = toNonNegativeNumber(want.targetAmount)
    const months = toPositiveIntegerOrNull(want.monthsToTarget) ?? 0
    const calculated = targetAmount > 0 && months > 0 ? (targetAmount / months) : 0

    // Manual amount is the default, so existing wants keep behaving the same.
    return manual > 0 ? manual : calculated
  }

  const totalWantsPerMonth = computed(() => {
    return wants.value.reduce((sum, want) => sum + getWantMonthlyAmount(want), 0)
  })

  const totalDebtPaymentsPerMonth = computed(() => {
    return debts.value.reduce((sum, debt) => sum + (debt.monthlyPayment || 0), 0)
  })

  const totalRecurringPaymentsPerMonth = computed(() => {
    return recurringPayments.value.reduce((sum, payment) => sum + (payment.monthlyAmount || 0), 0)
  })

  const totalPlannedOutflowPerMonth = computed(() => {
    return totalSavingsPerMonth.value + totalWantsPerMonth.value + totalDebtPaymentsPerMonth.value + totalRecurringPaymentsPerMonth.value
  })

  function setGeneralSavings(amount: number) {
    savings.value.monthlyAmount = Number.isNaN(amount) ? 0 : Math.max(0, amount)
  }

  function addWant() {
    wants.value.push({
      id: crypto.randomUUID(),
      name: '',
      monthlyAmount: 0,
      monthsToTarget: 12,
      invested: false
    })
  }

  function updateWant(id: string, patch: Partial<WantPlan>) {
    const index = wants.value.findIndex(want => want.id === id)
    if (index === -1) return

    Object.assign(wants.value[index]!, patch)
  }

  function removeWant(id: string) {
    wants.value = wants.value.filter(want => want.id !== id)
  }

  function addDebt() {
    debts.value.push({
      id: crypto.randomUUID(),
      name: '',
      totalDebt: 0,
      deadline: new Date().toISOString().slice(0, 10),
      monthlyPayment: 0
    })
  }

  function updateDebt(id: string, patch: Partial<DebtPlan>) {
    const index = debts.value.findIndex(debt => debt.id === id)
    if (index === -1) return

    Object.assign(debts.value[index]!, patch)
  }

  function removeDebt(id: string) {
    debts.value = debts.value.filter(debt => debt.id !== id)
  }

  function addRecurringPayment() {
    recurringPayments.value.push({
      id: crypto.randomUUID(),
      name: '',
      monthlyAmount: 0,
      category: 'Bills'
    })
  }

  function updateRecurringPayment(id: string, patch: Partial<RecurringPayment>) {
    const index = recurringPayments.value.findIndex(payment => payment.id === id)
    if (index === -1) return

    Object.assign(recurringPayments.value[index]!, patch)
  }

  function removeRecurringPayment(id: string) {
    recurringPayments.value = recurringPayments.value.filter(payment => payment.id !== id)
  }

  return {
    savings,
    wants,
    debts,
    recurringPayments,
    totalSavingsPerMonth,
    totalWantsPerMonth,
    totalDebtPaymentsPerMonth,
    totalRecurringPaymentsPerMonth,
    totalPlannedOutflowPerMonth,
    getWantMonthlyAmount,
    setGeneralSavings,
    addWant,
    updateWant,
    removeWant,
    addDebt,
    updateDebt,
    removeDebt,
    addRecurringPayment,
    updateRecurringPayment,
    removeRecurringPayment
  }
})
