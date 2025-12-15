<script setup lang="ts">
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import type { TabsItem } from '@nuxt/ui'
import { storeToRefs } from 'pinia'
import { usePlansStore } from '~/stores/plans'
import { useBudgetStore } from '~/stores/budget'
import { parseTransactionDate } from '~/utils/dateParser'

type FinanceEntry = {
  id: string
  timestamp: string
  data: Record<string, unknown>
}

type Transaction = {
  date: Date
  amount: number
  category: string
  description: string
}

type CategorySummary = {
  category: string
  planned: number
  actual: number
  variance: number
}

const plansStore = usePlansStore()
const budgetStore = useBudgetStore()

const {
  savings,
  recurringPayments,
  totalSavingsPerMonth,
  totalWantsPerMonth,
  totalDebtPaymentsPerMonth,
  totalRecurringPaymentsPerMonth
} = storeToRefs(plansStore)

const now = new Date()
const monthIds = computed(() => {
  return Array.from({ length: 12 }, (_, index) => {
    return format(subMonths(now, index), 'yyyy-MM')
  })
})

const monthTabItems = computed<TabsItem[]>(() => {
  return monthIds.value.map(monthId => ({
    label: format(new Date(`${monthId}-01T00:00:00`), 'MMM yyyy'),
    value: monthId
  }))
})

const selectedMonthId = ref<string>(format(now, 'yyyy-MM'))

watchEffect(() => {
  budgetStore.ensureMonth(selectedMonthId.value)
})

function formatCurrency(value: number): string {
  return value.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  })
}

const month = computed(() => budgetStore.getMonth(selectedMonthId.value))

const plannedIncomeTotal = computed(() => {
  return month.value.income.reduce((sum, line) => sum + (line.amount || 0), 0)
})

const plannedItemsTotal = computed(() => {
  return month.value.items.reduce((sum, item) => sum + (item.plannedAmount || 0), 0)
})

const plannedSavings = computed(() => {
  const override = month.value.plannedSavingsOverride
  if (override != null) {
    return override
  }

  return savings.value.monthlyAmount ?? totalSavingsPerMonth.value
})

const plannedCommitmentsTotal = computed(() => {
  return plannedSavings.value
    + totalWantsPerMonth.value
    + totalDebtPaymentsPerMonth.value
    + totalRecurringPaymentsPerMonth.value
})

const plannedOutflowTotal = computed(() => {
  return plannedCommitmentsTotal.value + plannedItemsTotal.value
})

const plannedNet = computed(() => {
  return plannedIncomeTotal.value - plannedOutflowTotal.value
})

const resolveCategoryKey = (value: string): string => value.trim().toLowerCase()

const extractTransactions = (entry: FinanceEntry | null): Transaction[] => {
  if (!entry || !entry.data) {
    return []
  }

  const payload = entry.data
  const source = Array.isArray(payload.transactions)
    ? payload.transactions
    : Array.isArray(payload)
      ? payload
      : []

  return source
    .map((item: unknown) => {
      const record = item as Record<string, unknown>
      const date = parseTransactionDate(record.date as string)
      const amount = typeof record.amount === 'string' ? Number.parseFloat(record.amount) : Number(record.amount)
      const category = (record.category as string | undefined) ?? 'Uncategorized'
      const description = (record.description as string | undefined) ?? ''

      if (!date || Number.isNaN(amount)) {
        return null
      }

      return { date, amount, category, description }
    })
    .filter((item): item is Transaction => item !== null)
}

const { data: latestEntry } = await useAsyncData<FinanceEntry | null>('finance-latest', async () => {
  try {
    return await $fetch<FinanceEntry>('/api/finance/latest')
  } catch {
    return null
  }
}, {
  default: () => null
})

const monthRange = computed(() => {
  const start = startOfMonth(new Date(`${selectedMonthId.value}-01T00:00:00`))
  const end = endOfMonth(start)
  return { start, end }
})

const monthTransactions = computed(() => {
  const all = extractTransactions(latestEntry.value)
  return all.filter((tx) => {
    return tx.date >= monthRange.value.start && tx.date <= monthRange.value.end
  })
})

const actualIncome = computed(() => {
  return monthTransactions.value.reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0), 0)
})

const actualSpent = computed(() => {
  return monthTransactions.value.reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0)
})

const actualNet = computed(() => {
  return actualIncome.value - actualSpent.value
})

const actualByCategory = computed(() => {
  const buckets = new Map<string, number>()

  for (const tx of monthTransactions.value) {
    const spent = tx.amount < 0 ? Math.abs(tx.amount) : 0
    if (!spent) continue

    const key = resolveCategoryKey(tx.category)
    const label = tx.category
    const previous = buckets.get(key) ?? 0
    buckets.set(key, previous + spent)

    if (label && key !== label) {
      // no-op
    }
  }

  return Array.from(buckets.entries())
    .map(([key, value]) => ({
      key,
      category: key,
      value
    }))
    .sort((a, b) => b.value - a.value)
})

const plannedByCategory = computed(() => {
  const buckets = new Map<string, number>()

  for (const item of month.value.items) {
    const planned = item.plannedAmount || 0
    if (!planned) continue

    const key = resolveCategoryKey(item.category)
    const previous = buckets.get(key) ?? 0
    buckets.set(key, previous + planned)
  }

  for (const payment of recurringPayments.value) {
    const planned = payment.monthlyAmount || 0
    if (!planned) continue

    const key = resolveCategoryKey(payment.category ?? 'Recurring')
    const previous = buckets.get(key) ?? 0
    buckets.set(key, previous + planned)
  }

  return buckets
})

const actualByCategoryMap = computed(() => {
  const buckets = new Map<string, number>()

  for (const tx of monthTransactions.value) {
    const spent = tx.amount < 0 ? Math.abs(tx.amount) : 0
    if (!spent) continue

    const key = resolveCategoryKey(tx.category)
    const previous = buckets.get(key) ?? 0
    buckets.set(key, previous + spent)
  }

  return buckets
})

const budgetVsActual = computed<CategorySummary[]>(() => {
  const keys = new Set<string>()

  for (const key of plannedByCategory.value.keys()) keys.add(key)
  for (const key of actualByCategoryMap.value.keys()) keys.add(key)

  return Array.from(keys)
    .map((key) => {
      const planned = plannedByCategory.value.get(key) ?? 0
      const actual = actualByCategoryMap.value.get(key) ?? 0
      const variance = planned - actual

      return {
        category: key,
        planned,
        actual,
        variance
      }
    })
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
})

const savingsOverrideModel = computed({
  get: () => month.value.plannedSavingsOverride ?? null,
  set: (value: number | null) => budgetStore.setPlannedSavingsOverride(selectedMonthId.value, value)
})
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-6 lg:max-w-5xl">
    <UPageCard
      title="Monthly budget"
      description="Plan income, savings, and spending per month, then compare against imported transactions."
      variant="naked"
      class="mb-2"
    />

    <UPageCard variant="subtle">
      <div class="flex flex-col gap-4">
        <UTabs v-model="selectedMonthId" :items="monthTabItems" class="w-full" />

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <UCard>
            <p class="text-xs text-muted uppercase mb-1.5">
              Planned income
            </p>
            <p class="text-2xl font-semibold text-highlighted">
              {{ formatCurrency(plannedIncomeTotal) }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs text-muted uppercase mb-1.5">
              Planned outflow
            </p>
            <p class="text-2xl font-semibold text-highlighted">
              {{ formatCurrency(plannedOutflowTotal) }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs text-muted uppercase mb-1.5">
              Actual spent
            </p>
            <p class="text-2xl font-semibold text-highlighted">
              {{ formatCurrency(actualSpent) }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs text-muted uppercase mb-1.5">
              Net (planned / actual)
            </p>
            <p class="text-2xl font-semibold text-highlighted">
              {{ formatCurrency(plannedNet) }}
              <span class="text-muted text-base font-normal">
                / {{ formatCurrency(actualNet) }}
              </span>
            </p>
          </UCard>
        </div>

        <USeparator />

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-4 flex-wrap">
                <h3 class="text-sm font-medium text-highlighted">
                  Income
                </h3>
                <UButton
                  color="neutral"
                  icon="i-lucide-plus"
                  label="Add income"
                  size="sm"
                  class="w-fit"
                  @click="budgetStore.addIncomeLine(selectedMonthId)"
                />
              </div>
            </template>

            <div class="flex flex-col gap-3">
              <div
                v-for="line in month.income"
                :key="line.id"
                class="flex flex-wrap items-end gap-3"
              >
                <UFormField :name="`income-name-${line.id}`" label="Name" class="flex-1 min-w-[10rem]">
                  <UInput v-model="line.name" placeholder="Salary, bonus, etc." />
                </UFormField>

                <UFormField :name="`income-amount-${line.id}`" label="Amount" class="w-full sm:w-40">
                  <UInput v-model.number="line.amount" type="number" step="10" />
                </UFormField>

                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  class="self-start"
                  @click="budgetStore.removeIncomeLine(selectedMonthId, line.id)"
                />
              </div>
            </div>
          </UCard>

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
                class="flex max-sm:flex-col justify-between items-start gap-4"
              >
                <div class="flex items-center gap-3 w-full max-w-xs">
                  <UInput
                    v-model.number="savingsOverrideModel"
                    type="number"
                    min="0"
                    step="10"
                    class="w-full"
                    placeholder="(use default)"
                  />
                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-rotate-ccw"
                    @click="budgetStore.setPlannedSavingsOverride(selectedMonthId, null)"
                  />
                </div>
              </UFormField>

              <div class="text-sm">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted">Wants (from Plans)</span>
                  <span class="text-highlighted font-medium">{{ formatCurrency(totalWantsPerMonth) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3 mt-2">
                  <span class="text-muted">Debt payments (from Plans)</span>
                  <span class="text-highlighted font-medium">{{ formatCurrency(totalDebtPaymentsPerMonth) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3 mt-2">
                  <span class="text-muted">Recurring (from Plans)</span>
                  <span class="text-highlighted font-medium">{{ formatCurrency(totalRecurringPaymentsPerMonth) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-default">
                  <span class="text-muted">Total commitments</span>
                  <span class="text-highlighted font-semibold">{{ formatCurrency(plannedCommitmentsTotal) }}</span>
                </div>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </UPageCard>

    <UPageCard
      variant="subtle"
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }"
    >
      <template #header>
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <h2 class="text-sm font-medium text-highlighted">
            Planned spending items
          </h2>
          <UButton
            color="neutral"
            icon="i-lucide-plus"
            label="Add item"
            size="sm"
            class="w-fit"
            @click="budgetStore.addBudgetItem(selectedMonthId)"
          />
        </div>
      </template>

      <div v-if="month.items.length" class="divide-y divide-default">
        <div
          v-for="item in month.items"
          :key="item.id"
          class="flex flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <UFormField :name="`item-name-${item.id}`" label="Name" class="flex-1 min-w-[10rem]">
              <UInput v-model="item.name" placeholder="Groceries, transport, etc." />
            </UFormField>

            <UFormField :name="`item-category-${item.id}`" label="Category" class="w-full sm:w-48">
              <UInput v-model="item.category" placeholder="Bills, groceries, ..." />
            </UFormField>

            <UFormField :name="`item-planned-${item.id}`" label="Planned" class="w-full sm:w-40">
              <UInput
                v-model.number="item.plannedAmount"
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
              @click="budgetStore.removeBudgetItem(selectedMonthId, item.id)"
            />
          </div>
        </div>
      </div>

      <div v-else class="px-4 py-6 sm:px-6 text-sm text-muted">
        No planned items yet. Use “Add item” to start building your monthly sheet.
      </div>
    </UPageCard>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <UCard>
        <template #header>
          <h3 class="text-sm font-medium text-highlighted">
            Budget vs Actual (by category)
          </h3>
        </template>

        <div v-if="budgetVsActual.length" class="flex flex-col gap-2 text-sm">
          <div
            v-for="row in budgetVsActual"
            :key="row.category"
            class="flex items-center justify-between gap-3"
          >
            <span class="text-muted capitalize">{{ row.category }}</span>
            <span class="text-dimmed">{{ formatCurrency(row.planned) }} / {{ formatCurrency(row.actual) }}</span>
            <span
              class="font-medium"
              :class="row.variance >= 0 ? 'text-success' : 'text-error'"
            >
              {{ row.variance >= 0 ? '+' : '' }}{{ formatCurrency(row.variance) }}
            </span>
          </div>
        </div>

        <div v-else class="text-sm text-muted">
          Add planned items or import transactions to see category variance.
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="text-sm font-medium text-highlighted">
            Actual spending (top categories)
          </h3>
        </template>

        <div v-if="actualByCategory.length" class="flex flex-col gap-2 text-sm">
          <div
            v-for="row in actualByCategory.slice(0, 8)"
            :key="row.key"
            class="flex items-center justify-between gap-3"
          >
            <span class="text-muted capitalize">{{ row.category }}</span>
            <span class="text-highlighted font-medium">{{ formatCurrency(row.value) }}</span>
          </div>
        </div>

        <div v-else class="text-sm text-muted">
          No imported transactions found for this month.
        </div>
      </UCard>
    </div>
  </div>
</template>
