<script setup lang="ts">
import { format } from 'date-fns'
import type { TabsItem } from '@nuxt/ui'
import { storeToRefs } from 'pinia'
import { usePlansStore } from '~/stores/plans'
import { useBudgetStore } from '~/stores/budget'
import { formatCurrency } from '~/utils/currency'

const plansStore = usePlansStore()
const budgetStore = useBudgetStore()

const { savings, wants, debts, totalSavingsPerMonth, totalWantsPerMonth } = storeToRefs(plansStore)
const { setGeneralSavings, addWant, removeWant, addDebt, removeDebt, getWantMonthlyAmount, getDebtMonthlyPayment } = plansStore

const currentMonthId = format(new Date(), 'yyyy-MM')
const currentMonth = computed(() => budgetStore.getOrCreateMonth(currentMonthId))

const isDebtPaidThisMonth = (debtId: string): boolean => {
  return Boolean(currentMonth.value.debtPayments?.[debtId]?.paid)
}

const totalDebtPaymentsThisMonth = computed(() => {
  return debts.value.reduce((sum, debt) => {
    return sum + (isDebtPaidThisMonth(debt.id) ? 0 : getDebtMonthlyPayment(debt))
  }, 0)
})

const items: TabsItem[] = [{
  label: 'Savings',
  value: 'savings'
}, {
  label: 'Wants',
  value: 'wants'
}, {
  label: 'Debts',
  value: 'debts'
}, {
  label: 'Recurring',
  value: 'recurring'
}]

const current = ref<'savings' | 'wants' | 'debts' | 'recurring'>('savings')
</script>

<template>
  <UDashboardPanel id="plans">
    <template #header>
      <UDashboardNavbar title="Plans" :ui="{ toggle: 'hidden' }" />

      <UDashboardToolbar>
        <div class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 w-full">
          <UTabs v-model="current" :items="items" class="max-w-md min-w-max" />
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <div v-if="current === 'savings'" class="flex flex-col gap-4 sm:gap-6 lg:max-w-2xl">
        <UPageCard
          title="General savings"
          description="Set how much you want to save per month overall."
          variant="naked"
          class="mb-2"
        />

        <UPageCard variant="subtle">
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p class="text-xs text-muted uppercase mb-1.5">
                  Monthly savings
                </p>
                <p class="text-2xl font-semibold text-highlighted">
                  {{ formatCurrency(totalSavingsPerMonth) }}
                </p>
              </div>
            </div>

            <UFormField
              name="monthlyAmount"
              label="Monthly savings amount"
              description="This is your total monthly savings across everything."
              class="flex max-sm:flex-col justify-between items-start gap-4"
            >
              <UInput
                :model-value="savings.monthlyAmount"
                type="number"
                min="0"
                step="10"
                class="w-full max-w-xs"
                @update:model-value="value => setGeneralSavings(Number(value))"
              />
            </UFormField>
          </div>
        </UPageCard>
      </div>

      <div v-else-if="current === 'wants'" class="flex flex-col gap-4 sm:gap-6 lg:max-w-3xl">
        <UPageCard
          title="Wants overview"
          description="Plan for the things you want and how much you set aside each month."
          variant="naked"
          class="mb-2"
        >
          <template #footer>
            <div class="flex flex-wrap items-center justify-between gap-4 w-full">
              <div class="text-sm text-muted">
                Total monthly for wants
              </div>
              <div class="text-2xl font-semibold text-highlighted">
                {{ formatCurrency(totalWantsPerMonth) }}
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
                Wants
              </h2>

              <UButton
                color="neutral"
                icon="i-lucide-plus"
                label="Add want"
                size="sm"
                class="w-fit"
                @click="addWant"
              />
            </div>
          </template>

          <div v-if="wants.length" class="divide-y divide-default">
            <div
              v-for="want in wants"
              :key="want.id"
              class="flex flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4"
            >
              <div class="flex items-start justify-between gap-3">
                <UFormField
                  :name="`name-${want.id}`"
                  label="Name"
                  class="flex-1 min-w-0"
                >
                  <UInput
                    v-model="want.name"
                    placeholder="New laptop, holiday, etc."
                  />
                </UFormField>

                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  class="shrink-0 mt-6"
                  @click="removeWant(want.id)"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <UFormField
                  :name="`targetAmount-${want.id}`"
                  label="Target amount"
                >
                  <UInput
                    v-model.number="want.targetAmount"
                    type="number"
                    min="0"
                    step="50"
                    placeholder="Optional"
                  />
                </UFormField>

                <UFormField
                  :name="`monthsToTarget-${want.id}`"
                  label="Months"
                >
                  <UInput
                    v-model.number="want.monthsToTarget"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="Optional"
                  />
                </UFormField>

                <UFormField
                  :name="`calculatedMonthly-${want.id}`"
                  label="Monthly (calculated)"
                >
                  <UInput
                    :model-value="formatCurrency(getWantMonthlyAmount({ ...want, monthlyAmount: 0 }))"
                    disabled
                  />
                </UFormField>
              </div>

              <UFormField
                :name="`manualMonthly-${want.id}`"
                label="Monthly override (optional)"
                description="If set, overrides the calculated monthly amount. Set to 0 to use the calculation."
              >
                <UInput
                  v-model.number="want.monthlyAmount"
                  type="number"
                  min="0"
                  step="10"
                />
              </UFormField>

              <UFormField
                :name="`notes-${want.id}`"
                label="Notes"
              >
                <UTextarea
                  v-model="want.notes"
                  :rows="2"
                  autoresize
                  placeholder="Optional details for this goal."
                />
              </UFormField>
            </div>
          </div>

          <div v-else class="px-4 py-6 sm:px-6 text-sm text-muted">
            You don't have any wants yet. Use "Add want" to start planning.
          </div>
        </UPageCard>
      </div>

      <PlansRecurringPayments v-else-if="current === 'recurring'" />

      <div v-else class="flex flex-col gap-4 sm:gap-6 lg:max-w-3xl">
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

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                      @update:model-value="value => budgetStore.setDebtPaymentStatus(currentMonthId, debt.id, Boolean(value))"
                    />
                    <UButton
                      color="neutral"
                      variant="ghost"
                      icon="i-lucide-rotate-ccw"
                      class="shrink-0"
                      @click="budgetStore.clearDebtPaymentStatus(currentMonthId, debt.id)"
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
  </UDashboardPanel>
</template>
