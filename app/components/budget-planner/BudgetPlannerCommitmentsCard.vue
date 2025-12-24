<script setup lang="ts">
import { format } from 'date-fns'
import { storeToRefs } from 'pinia'
import { useBudgetStore } from '~/stores/budget'
import { usePlansStore } from '~/stores/plans'
import { formatCurrency } from '~/utils/currency'

const props = defineProps<{
  monthId: string
}>()

const plansStore = usePlansStore()
const budgetStore = useBudgetStore()

const {
  savings,
  wants,
  debts,
  totalSavingsPerMonth,
  totalRecurringPaymentsPerMonth
} = storeToRefs(plansStore)

const month = computed(() => budgetStore.getOrCreateMonth(props.monthId))

const plannedSavings = computed(() => {
  const override = month.value.plannedSavingsOverride
  if (override != null) {
    return override
  }

  return savings.value.monthlyAmount ?? totalSavingsPerMonth.value
})

const resolveWantMonthlyForMonth = (wantId: string): number => {
  const want = wants.value.find(w => w.id === wantId)
  if (!want) return 0

  const override = month.value.wantOverrides?.[wantId]
  if (override?.disabled) return 0

  const defaultMonthly = plansStore.getWantMonthlyAmount(want)
  return override?.amountOverride ?? defaultMonthly
}

const plannedWantsTotal = computed(() => {
  return wants.value.reduce((sum, want) => sum + resolveWantMonthlyForMonth(want.id), 0)
})

const resolveDebtMonthlyForMonth = (debtId: string): number => {
  const debt = debts.value.find(d => d.id === debtId)
  if (!debt) return 0

  const status = month.value.debtPayments?.[debtId]
  if (status?.paid) return 0

  return plansStore.getDebtMonthlyPayment(debt)
}

const plannedDebtPaymentsTotal = computed(() => {
  return debts.value.reduce((sum, debt) => sum + resolveDebtMonthlyForMonth(debt.id), 0)
})

const plannedCommitmentsTotal = computed(() => {
  return plannedSavings.value
    + plannedWantsTotal.value
    + plannedDebtPaymentsTotal.value
    + totalRecurringPaymentsPerMonth.value
})

const savingsOverrideModel = computed({
  get: () => month.value.plannedSavingsOverride ?? null,
  set: (value: number | null) => budgetStore.setPlannedSavingsOverride(props.monthId, value)
})
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-sm font-medium text-highlighted">
        Planned commitments
      </h3>
    </template>

    <div class="flex flex-col gap-4">
      <UFormField
        name="planned-savings"
        label="Planned savings"
        description="Defaults to your Savings plan. Override per month if needed."
        class="flex flex-col gap-2"
      >
        <div class="flex items-center gap-3 w-full min-w-0">
          <UInput
            v-model.number="savingsOverrideModel"
            type="number"
            min="0"
            step="10"
            class="flex-1 min-w-0"
            placeholder="(use default)"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-rotate-ccw"
            class="shrink-0"
            @click="budgetStore.setPlannedSavingsOverride(monthId, null)"
          />
        </div>
      </UFormField>

      <div class="text-sm space-y-2">
        <div class="flex items-center justify-between gap-3">
          <span class="text-muted">Wants (this month)</span>
          <span class="text-highlighted font-medium">{{ formatCurrency(plannedWantsTotal) }}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-muted">Debt payments (this month)</span>
          <span class="text-highlighted font-medium">{{ formatCurrency(plannedDebtPaymentsTotal) }}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="text-muted">Recurring (from Plans)</span>
          <span class="text-highlighted font-medium">{{ formatCurrency(totalRecurringPaymentsPerMonth) }}</span>
        </div>
        <div class="flex items-center justify-between gap-3 pt-2 border-t border-default">
          <span class="text-muted">Total commitments</span>
          <span class="text-highlighted font-semibold">{{ formatCurrency(plannedCommitmentsTotal) }}</span>
        </div>
      </div>

      <div class="pt-4 border-t border-default/50">
        <h4 class="text-sm font-medium text-highlighted mb-3">
          Wants ({{ format(new Date(`${monthId}-01T00:00:00`), 'MMM yyyy') }})
        </h4>

        <div v-if="wants.length" class="sm:hidden divide-y divide-default/50">
          <div
            v-for="want in wants"
            :key="want.id"
            class="py-3 flex flex-col gap-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="text-sm text-highlighted font-medium truncate">
                  {{ want.name || 'Untitled want' }}
                </div>
                <div class="mt-1 flex items-center gap-2 flex-wrap">
                  <span class="text-xs text-muted">
                    Default: {{ formatCurrency(plansStore.getWantMonthlyAmount(want)) }}
                  </span>
                </div>
              </div>

              <div class="text-right shrink-0">
                <div class="text-xs text-muted">
                  Effective
                </div>
                <div class="text-sm text-highlighted font-medium whitespace-nowrap">
                  {{ formatCurrency(resolveWantMonthlyForMonth(want.id)) }}
                </div>
              </div>
            </div>

            <div class="flex items-end gap-3">
              <UFormField
                :name="`want-override-${want.id}`"
                label="Override"
                class="flex-1"
              >
                <UInput
                  :model-value="month.wantOverrides?.[want.id]?.amountOverride"
                  type="number"
                  min="0"
                  step="10"
                  placeholder="(default)"
                  @update:model-value="(value) => {
                    const amount = value == null || String(value) === '' ? null : Number(value)
                    budgetStore.setWantOverride(monthId, want.id, { amountOverride: amount !== null && Number.isFinite(amount) ? amount : null })
                  }"
                />
              </UFormField>

              <UFormField
                :name="`want-disabled-${want.id}`"
                label="Disabled"
                class="w-28"
              >
                <USwitch
                  :model-value="Boolean(month.wantOverrides?.[want.id]?.disabled)"
                  @update:model-value="value => budgetStore.setWantOverride(monthId, want.id, { disabled: Boolean(value) })"
                />
              </UFormField>

              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-rotate-ccw"
                class="shrink-0"
                @click="budgetStore.clearWantOverride(monthId, want.id)"
              />
            </div>
          </div>
        </div>

        <div v-if="wants.length" class="hidden sm:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default text-xs text-muted uppercase">
                <th class="py-2 text-left font-medium">
                  Want
                </th>
                <th class="py-2 text-right font-medium">
                  Default
                </th>
                <th class="py-2 text-left font-medium">
                  Override
                </th>
                <th class="py-2 text-center font-medium">
                  Disabled
                </th>
                <th class="py-2 text-right font-medium">
                  Effective
                </th>
                <th class="py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="want in wants"
                :key="want.id"
                class="border-b border-default/50"
              >
                <td class="py-2.5 text-highlighted font-medium">
                  <div class="flex items-center gap-2 min-w-0">
                    <span class="truncate">{{ want.name || 'Untitled want' }}</span>
                  </div>
                </td>
                <td class="py-2.5 text-right text-dimmed whitespace-nowrap">
                  {{ formatCurrency(plansStore.getWantMonthlyAmount(want)) }}
                </td>
                <td class="py-2.5">
                  <UInput
                    :model-value="month.wantOverrides?.[want.id]?.amountOverride"
                    type="number"
                    min="0"
                    step="10"
                    placeholder="(default)"
                    class="w-36"
                    @update:model-value="(value) => {
                      const amount = value == null || String(value) === '' ? null : Number(value)
                      budgetStore.setWantOverride(monthId, want.id, { amountOverride: amount !== null && Number.isFinite(amount) ? amount : null })
                    }"
                  />
                </td>
                <td class="py-2.5 text-center">
                  <USwitch
                    :model-value="Boolean(month.wantOverrides?.[want.id]?.disabled)"
                    @update:model-value="value => budgetStore.setWantOverride(monthId, want.id, { disabled: Boolean(value) })"
                  />
                </td>
                <td class="py-2.5 text-right text-highlighted font-medium whitespace-nowrap">
                  {{ formatCurrency(resolveWantMonthlyForMonth(want.id)) }}
                </td>
                <td class="py-2.5 text-right">
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-rotate-ccw"
                    @click="budgetStore.clearWantOverride(monthId, want.id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="text-sm text-muted">
          No wants yet. Add some in Plans → Wants.
        </div>
      </div>
    </div>
  </UCard>
</template>
