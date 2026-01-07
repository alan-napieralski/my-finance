<script setup lang="ts">
import { format } from 'date-fns'
import { storeToRefs } from 'pinia'
import { z } from 'zod'
import { useBudgetStore } from '~/stores/budget'
import { usePlansStore } from '~/stores/plans'
import { formatCurrency } from '~/utils/currency'

const plansStore = usePlansStore()
const budgetStore = useBudgetStore()

const { debts } = storeToRefs(plansStore)
const { addDebt, removeDebt, getDebtMonthlyPayment } = plansStore

const monthIdSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

const validateMonthId = (monthId: unknown): string => {
  const result = monthIdSchema.safeParse(monthId)
  if (!result.success) {
    throw new Error(`[PlansDebtsTab] Invalid monthId: ${String(monthId)}. Expected YYYY-MM.`)
  }
  return result.data
}

const currentMonthId = ref(validateMonthId(format(new Date(), 'yyyy-MM')))
const currentMonth = computed(() => budgetStore.getOrCreateMonth(currentMonthId.value))

const refreshCurrentMonthId = () => {
  currentMonthId.value = validateMonthId(format(new Date(), 'yyyy-MM'))
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    refreshCurrentMonthId()
  }
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', refreshCurrentMonthId)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', refreshCurrentMonthId)
  }
})

const isDebtPaidThisMonth = (debtId: string): boolean => {
  return Boolean(currentMonth.value.debtPayments?.[debtId]?.paid)
}

const totalDebtPaymentsThisMonth = computed(() => {
  return debts.value.reduce((sum, debt) => {
    return sum + (isDebtPaidThisMonth(debt.id) ? 0 : getDebtMonthlyPayment(debt))
  }, 0)
})

const setDebtPaidThisMonth = (debtId: string, value: unknown) => {
  const monthId = validateMonthId(currentMonthId.value)
  if (!monthId) {
    throw new Error(`[PlansDebtsTab] Invalid monthId in PlansDebtsTab: ${String(currentMonthId.value)}`)
  }
  budgetStore.setDebtPaymentStatus(monthId, debtId, Boolean(value))
}

const resetDebtPaidThisMonth = (debtId: string) => {
  const monthId = validateMonthId(currentMonthId.value)
  if (!monthId) {
    throw new Error(`[PlansDebtsTab] Invalid monthId in PlansDebtsTab: ${String(currentMonthId.value)}`)
  }
  budgetStore.clearDebtPaymentStatus(monthId, debtId)
}
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-6 lg:max-w-3xl">
    <UPageCard
      title="Debt overview"
      description="Track your debts and payoff deadlines. Monthly payment is calculated automatically."
      variant="naked"
      class="mb-2"
    >
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-4 w-full">
          <div class="text-sm text-muted">
            Remaining debt payments (this month)
          </div>
          <div class="text-2xl font-semibold text-highlighted">
            {{ formatCurrency(totalDebtPaymentsThisMonth) }}
          </div>
        </div>
      </template>
    </UPageCard>

    <UPageCard
      variant="subtle"
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }"
    >
      <template #header>
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <h2 class="text-sm font-medium text-highlighted">
            Debts
          </h2>

          <UButton
            color="neutral"
            icon="i-lucide-plus"
            label="Add debt"
            size="sm"
            class="w-fit"
            @click="addDebt"
          />
        </div>
      </template>

      <div v-if="debts.length" class="divide-y divide-default">
        <div
          v-for="debt in debts"
          :key="debt.id"
          class="flex flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4"
        >
          <div class="flex items-start justify-between gap-3">
            <UFormField
              :name="`debt-name-${debt.id}`"
              label="Name"
              class="flex-1 min-w-0"
            >
              <UInput
                v-model="debt.name"
                placeholder="Credit card, loan, etc."
              />
            </UFormField>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              class="shrink-0 mt-6"
              @click="removeDebt(debt.id)"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <UFormField
              :name="`debt-total-${debt.id}`"
              label="Total debt"
            >
              <UInput
                v-model.number="debt.totalDebt"
                type="number"
                min="0"
                step="100"
              />
            </UFormField>

            <UFormField
              :name="`debt-deadline-${debt.id}`"
              label="Deadline"
            >
              <UInput
                v-model="debt.deadline"
                type="date"
              />
            </UFormField>

            <UFormField
              :name="`debt-monthly-${debt.id}`"
              label="Monthly payment (calculated)"
            >
              <UInput
                :model-value="formatCurrency(getDebtMonthlyPayment(debt))"
                disabled
              />
            </UFormField>

            <UFormField
              :name="`debt-paid-${debt.id}`"
              label="Paid this month"
            >
              <div class="flex items-center justify-between gap-3">
                <USwitch
                  :model-value="isDebtPaidThisMonth(debt.id)"
                  @update:model-value="value => setDebtPaidThisMonth(debt.id, value)"
                />
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-rotate-ccw"
                  class="shrink-0"
                  @click="resetDebtPaidThisMonth(debt.id)"
                />
              </div>
            </UFormField>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField
              :name="`debt-rate-${debt.id}`"
              label="Interest rate (%)"
            >
              <UInput
                v-model.number="debt.interestRate"
                type="number"
                min="0"
                step="0.1"
                placeholder="Optional"
              />
            </UFormField>

            <UFormField
              :name="`debt-notes-${debt.id}`"
              label="Notes"
            >
              <UTextarea
                v-model="debt.notes"
                :rows="2"
                autoresize
                placeholder="Optional extra details."
              />
            </UFormField>
          </div>
        </div>
      </div>

      <div v-else class="px-4 py-6 sm:px-6 text-sm text-muted">
        You don't have any debts recorded yet. Use "Add debt" to start tracking them.
      </div>
    </UPageCard>
  </div>
</template>
