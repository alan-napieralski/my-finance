import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import type { GeneralSavings, WantPlan, DebtPlan, RecurringPayment } from '~/types'

export const usePlansStore = defineStore('plans', () => {
  const savings = useStorage<GeneralSavings>('plans:savings-general', {
    monthlyAmount: 0
  })

  const wants = useStorage<WantPlan[]>('plans:wants', [])
  const debts = useStorage<DebtPlan[]>('plans:debts', [])
  const recurringPayments = useStorage<RecurringPayment[]>('plans:recurring', [])

  const totalSavingsPerMonth = computed(() => savings.value.monthlyAmount ?? 0)

  const totalWantsPerMonth = computed(() => {
    return wants.value.reduce((sum, want) => sum + (want.monthlyAmount || 0), 0)
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
      monthlyAmount: 0
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
