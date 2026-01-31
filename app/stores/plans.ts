import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { DebtPlan, GeneralSavings, PlansPayload, RecurringPayment, WantPlan } from '~/types'
import { apiFetch } from '~/composables/useApiFetch'

const LEGACY_STORAGE_KEYS = {
  savings: 'plans:savings-general',
  wants: 'plans:wants',
  debts: 'plans:debts',
  recurring: 'plans:recurring'
}

const toDateOrNull = (value: string): Date | null => {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(value)
  if (!match) return null

  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

const daysUntil = (deadline: string): number | null => {
  const date = toDateOrNull(deadline)
  if (!date) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const end = new Date(date)
  end.setHours(0, 0, 0, 0)

  const msPerDay = 1000 * 60 * 60 * 24
  return Math.ceil((end.getTime() - today.getTime()) / msPerDay)
}

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

const normalizeWant = (want: WantPlan): WantPlan => {
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
    monthsToTarget: want.monthsToTarget == null ? (derivedMonths ?? undefined) : (toPositiveIntegerOrNull(want.monthsToTarget) ?? undefined)
  }
}

const normalizeDebt = (debt: DebtPlan): DebtPlan => {
  return {
    ...debt,
    totalDebt: toNonNegativeNumber(debt.totalDebt),
    monthlyPayment: debt.monthlyPayment == null ? undefined : toNonNegativeNumber(debt.monthlyPayment),
    interestRate: debt.interestRate == null ? undefined : toNonNegativeNumber(debt.interestRate),
    deadline: debt.deadline ?? ''
  }
}

const normalizeRecurringPayment = (payment: RecurringPayment): RecurringPayment => {
  return {
    ...payment,
    monthlyAmount: toNonNegativeNumber(payment.monthlyAmount),
    category: payment.category ? payment.category : undefined,
    notes: payment.notes ? payment.notes : undefined
  }
}

const normalizePlans = (payload: PlansPayload): PlansPayload => {
  return {
    savings: {
      monthlyAmount: toNonNegativeNumber(payload.savings?.monthlyAmount ?? 0)
    },
    wants: (payload.wants ?? []).map(normalizeWant),
    debts: (payload.debts ?? []).map(normalizeDebt),
    recurringPayments: (payload.recurringPayments ?? []).map(normalizeRecurringPayment)
  }
}

const parseLegacyJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const readLegacyPlans = (): PlansPayload | null => {
  if (!import.meta.client) return null

  const savings = parseLegacyJson<GeneralSavings>(
    localStorage.getItem(LEGACY_STORAGE_KEYS.savings),
    { monthlyAmount: 0 }
  )
  const wants = parseLegacyJson<WantPlan[]>(localStorage.getItem(LEGACY_STORAGE_KEYS.wants), [])
  const debts = parseLegacyJson<DebtPlan[]>(localStorage.getItem(LEGACY_STORAGE_KEYS.debts), [])
  const recurringPayments = parseLegacyJson<RecurringPayment[]>(
    localStorage.getItem(LEGACY_STORAGE_KEYS.recurring),
    []
  )

  return normalizePlans({ savings, wants, debts, recurringPayments })
}

const clearLegacyPlans = () => {
  if (!import.meta.client) return
  localStorage.removeItem(LEGACY_STORAGE_KEYS.savings)
  localStorage.removeItem(LEGACY_STORAGE_KEYS.wants)
  localStorage.removeItem(LEGACY_STORAGE_KEYS.debts)
  localStorage.removeItem(LEGACY_STORAGE_KEYS.recurring)
}

const hasMeaningfulPlans = (payload: PlansPayload): boolean => {
  return payload.savings.monthlyAmount > 0
    || payload.wants.length > 0
    || payload.debts.length > 0
    || payload.recurringPayments.length > 0
}

export const usePlansStore = defineStore('plans', () => {
  const savings = ref<GeneralSavings>({ monthlyAmount: 0 })
  const wants = ref<WantPlan[]>([])
  const debts = ref<DebtPlan[]>([])
  const recurringPayments = ref<RecurringPayment[]>([])

  const isLoaded = ref(false)
  const isSaving = ref(false)
  const saveError = ref<string | null>(null)
  const lastSavedAt = ref<Date | null>(null)
  const isHydrating = ref(false)

  const toast = import.meta.client ? useToast() : null

  const applyPlans = (payload: PlansPayload) => {
    const normalized = normalizePlans(payload)
    savings.value = normalized.savings
    wants.value = normalized.wants
    debts.value = normalized.debts
    recurringPayments.value = normalized.recurringPayments
  }

  const serializePlans = (): PlansPayload => {
    return normalizePlans({
      savings: savings.value,
      wants: wants.value,
      debts: debts.value,
      recurringPayments: recurringPayments.value
    })
  }

  const savePlans = async () => {
    if (!isLoaded.value) return

    isSaving.value = true
    saveError.value = null

    try {
      const payload = serializePlans()

      await apiFetch('/api/plans', {
        method: 'PUT',
        body: payload
      })

      lastSavedAt.value = new Date()

      if (toast) {
        toast.add({
          title: 'Plans saved',
          color: 'success'
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save plans'
      saveError.value = message

      if (toast) {
        toast.add({
          title: 'Failed to save plans',
          description: 'Please try again.',
          color: 'error'
        })
      }
    } finally {
      isSaving.value = false
    }
  }

  const loadPlans = async () => {
    if (isLoaded.value) return

    isHydrating.value = true

    try {
      const payload = await apiFetch<PlansPayload>('/api/plans')
      const normalized = normalizePlans(payload)
      const legacy = readLegacyPlans()

      if (legacy && !hasMeaningfulPlans(normalized) && hasMeaningfulPlans(legacy)) {
        applyPlans(legacy)
        isLoaded.value = true
        await savePlans()
        clearLegacyPlans()
        return
      }

      applyPlans(normalized)
    } catch (error) {
      if (toast) {
        toast.add({
          title: 'Failed to load plans',
          description: 'Showing local data only. Please try again later.',
          color: 'error'
        })
      }
    } finally {
      isHydrating.value = false
      isLoaded.value = true
    }
  }

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

  const getDebtMonthlyPayment = (debt: DebtPlan): number => {
    const totalDebt = toNonNegativeNumber(debt.totalDebt)
    if (!totalDebt) return 0

    const remainingDays = debt.deadline ? daysUntil(debt.deadline) : null

    if (remainingDays != null) {
      // Uses the number of days until the deadline to estimate the monthly payment.
      // Monthly ~= totalDebt * (30 / daysRemaining)
      const effectiveDays = Math.max(1, remainingDays)
      return (totalDebt * 30) / effectiveDays
    }

    // Fallback to legacy/manual value if the deadline isn't parseable.
    return toNonNegativeNumber(debt.monthlyPayment)
  }

  const totalDebtPaymentsPerMonth = computed(() => {
    return debts.value.reduce((sum, debt) => sum + getDebtMonthlyPayment(debt), 0)
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
      monthsToTarget: 12
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
      deadline: new Date().toISOString().slice(0, 10)
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
      category: 'bills'
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
    isLoaded,
    isSaving,
    saveError,
    lastSavedAt,
    loadPlans,
    savePlans,
    totalSavingsPerMonth,
    totalWantsPerMonth,
    totalDebtPaymentsPerMonth,
    totalRecurringPaymentsPerMonth,
    totalPlannedOutflowPerMonth,
    getWantMonthlyAmount,
    getDebtMonthlyPayment,
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
