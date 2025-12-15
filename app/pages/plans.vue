<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import { storeToRefs } from 'pinia'
import { usePlansStore } from '~/stores/plans'

const plansStore = usePlansStore()

const { savings, wants, debts, totalSavingsPerMonth, totalWantsPerMonth, totalDebtPaymentsPerMonth } = storeToRefs(plansStore)
const { setGeneralSavings, addWant, removeWant, addDebt, removeDebt } = plansStore

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
}, {
  label: 'Monthly',
  value: 'monthly'
}]

const current = ref<'savings' | 'wants' | 'debts' | 'recurring' | 'monthly'>('savings')

const formatCurrency = (value: number) => {
  return value.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  })
}
</script>

<template>
  <UDashboardPanel id="plans">
    <template #header>
      <UDashboardNavbar title="Plans" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <!-- Placeholder for future actions (e.g., sync, export) -->
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <UTabs v-model="current" :items="items" class="w-full max-w-md" />
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
              <div class="flex flex-wrap items-center justify-between gap-3">
                <UFormField
                  :name="`name-${want.id}`"
                  label="Name"
                  class="flex-1 min-w-[10rem]"
                >
                  <UInput
                    v-model="want.name"
                    placeholder="New laptop, holiday, etc."
                  />
                </UFormField>

                <UFormField
                  :name="`monthly-${want.id}`"
                  label="Monthly amount"
                  class="w-full sm:w-40"
                >
                  <UInput
                    v-model.number="want.monthlyAmount"
                    type="number"
                    min="0"
                    step="10"
                  />
                </UFormField>

                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  class="self-start"
                  @click="removeWant(want.id)"
                />
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  :name="`targetDate-${want.id}`"
                  label="Target date"
                >
                  <UInput
                    v-model="want.targetDate"
                    type="date"
                    placeholder="Optional"
                  />
                </UFormField>
              </div>

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

      <PlansMonthlyBudget v-else-if="current === 'monthly'" />

      <div v-else class="flex flex-col gap-4 sm:gap-6 lg:max-w-3xl">
        <UPageCard
          title="Debt overview"
          description="Track your debts, payoff deadlines, and how much you choose to pay each month."
          variant="naked"
          class="mb-2"
        >
          <template #footer>
            <div class="flex flex-wrap items-center justify-between gap-4 w-full">
              <div class="text-sm text-muted">
                Total monthly debt payments
              </div>
              <div class="text-2xl font-semibold text-highlighted">
                {{ formatCurrency(totalDebtPaymentsPerMonth) }}
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
              <div class="flex flex-wrap items-center justify-between gap-3">
                <UFormField
                  :name="`debt-name-${debt.id}`"
                  label="Name"
                  class="flex-1 min-w-[10rem]"
                >
                  <UInput
                    v-model="debt.name"
                    placeholder="Credit card, loan, etc."
                  />
                </UFormField>

                <UFormField
                  :name="`debt-total-${debt.id}`"
                  label="Total debt"
                  class="w-full sm:w-40"
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
                  class="w-full sm:w-40"
                >
                  <UInput
                    v-model="debt.deadline"
                    type="date"
                  />
                </UFormField>

                <UFormField
                  :name="`debt-monthly-${debt.id}`"
                  label="Monthly payment"
                  class="w-full sm:w-40"
                >
                  <UInput
                    v-model.number="debt.monthlyPayment"
                    type="number"
                    min="0"
                    step="50"
                  />
                </UFormField>

                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  class="self-start"
                  @click="removeDebt(debt.id)"
                />
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
