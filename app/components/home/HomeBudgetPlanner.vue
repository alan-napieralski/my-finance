<script setup lang="ts">
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import type { TabsItem } from '@nuxt/ui'
import { storeToRefs } from 'pinia'
import { usePlansStore } from '~/stores/plans'
import { useBudgetStore } from '~/stores/budget'
import { parseTransactionDate } from '~/utils/dateParser'
import { formatCurrency } from '~/utils/currency'
import { getMainCategory, mainCategories } from '~/utils/budgetCategories'
import type { FinanceEntry, MainCategorySummary, SubcategorySummary, Transaction } from '~/types'

const plansStore = usePlansStore()
const budgetStore = useBudgetStore()

const {
  savings,
  wants,
  totalSavingsPerMonth,
  totalDebtPaymentsPerMonth,
  totalRecurringPaymentsPerMonth
} = storeToRefs(plansStore)

const now = ref(new Date())
const monthIds = computed(() => {
  return Array.from({ length: 12 }, (_, index) => {
    return format(subMonths(now.value, index), 'yyyy-MM')
  })
})

// Refresh on visibility change to handle overnight sessions
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    now.value = new Date()
  }
}

onMounted(() => {
  if (import.meta.client) {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
})

const monthTabItems = computed<TabsItem[]>(() => {
  return monthIds.value.map(monthId => ({
    label: format(new Date(`${monthId}-01T00:00:00`), 'MMM yyyy'),
    value: monthId
  }))
})

const selectedMonthId = ref<string>(format(now.value, 'yyyy-MM'))

const previousMonthId = computed(() => format(subMonths(new Date(`${selectedMonthId.value}-01T00:00:00`), 1), 'yyyy-MM'))
const previousMonthLabel = computed(() => format(subMonths(new Date(`${selectedMonthId.value}-01T00:00:00`), 1), 'MMM'))

const month = computed(() => budgetStore.getOrCreateMonth(selectedMonthId.value))

const plannedIncomeTotal = computed(() => {
  return month.value.income.reduce((sum, line) => sum + (line.amount || 0), 0)
})

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

const plannedCommitmentsTotal = computed(() => {
  return plannedSavings.value
    + plannedWantsTotal.value
    + totalDebtPaymentsPerMonth.value
    + totalRecurringPaymentsPerMonth.value
})

const resolveCategoryKey = (value: string): string => {
  const key = value.trim().toLowerCase()
  return key || 'uncategorized'
}

const extractTransactions = (entry: FinanceEntry | null): Transaction[] => {
  if (!entry || !entry.data) {
    return []
  }

  const payload = entry.data
  const source = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.transactions)
      ? payload.transactions
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

const { data: latestEntry, error: fetchError } = await useAsyncData<FinanceEntry | null>('finance-latest', async () => {
  return await $fetch<FinanceEntry>('/api/finance/latest')
}, {
  default: () => null
})

watch(fetchError, (error) => {
  if (error) {
    console.error('[HomeBudgetPlanner] Failed to fetch finance data:', error)
  }
})

const getMonthRange = (monthId: string) => {
  const start = startOfMonth(new Date(`${monthId}-01T00:00:00`))
  const end = endOfMonth(start)
  return { start, end }
}

const monthRange = computed(() => getMonthRange(selectedMonthId.value))

const allTransactions = computed(() => extractTransactions(latestEntry.value))

const monthTransactions = computed(() => {
  return allTransactions.value.filter((tx) => {
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

const buildActualByCategoryForMonth = (monthId: string) => {
  const { start, end } = getMonthRange(monthId)
  const buckets = new Map<string, number>()

  for (const tx of allTransactions.value) {
    if (tx.date < start || tx.date > end) continue

    const spent = tx.amount < 0 ? Math.abs(tx.amount) : 0
    if (!spent) continue

    const key = resolveCategoryKey(tx.category)
    const previous = buckets.get(key) ?? 0
    buckets.set(key, previous + spent)
  }

  return buckets
}

const actualByCategoryMap = computed(() => buildActualByCategoryForMonth(selectedMonthId.value))

const previousMonthActualByCategory = computed(() => {
  return buildActualByCategoryForMonth(previousMonthId.value)
})

// Subcategory breakdown with MoM
const subcategoryBreakdown = computed<SubcategorySummary[]>(() => {
  const keys = new Set<string>()

  for (const key of actualByCategoryMap.value.keys()) keys.add(key)
  for (const key of previousMonthActualByCategory.value.keys()) keys.add(key)

  return Array.from(keys)
    .map((key) => {
      const actual = actualByCategoryMap.value.get(key) ?? 0
      const previousMonth = previousMonthActualByCategory.value.get(key) ?? 0
      const momChange = actual - previousMonth

      let momChangePercent: number | null = null
      if (previousMonth > 0) {
        momChangePercent = Math.round((momChange / previousMonth) * 100)
      }

      return {
        subcategory: key,
        mainCategory: getMainCategory(key),
        actual,
        previousMonth,
        momChange,
        momChangePercent
      }
    })
    .sort((a, b) => b.actual - a.actual)
})

// Main category breakdown with MoM
const mainCategoryBreakdown = computed<MainCategorySummary[]>(() => {
  return mainCategories.map((mainCategory) => {
    const actual = subcategoryBreakdown.value
      .filter(s => s.mainCategory === mainCategory)
      .reduce((sum, s) => sum + s.actual, 0)

    const previousMonth = subcategoryBreakdown.value
      .filter(s => s.mainCategory === mainCategory)
      .reduce((sum, s) => sum + s.previousMonth, 0)

    const momChange = actual - previousMonth

    let momChangePercent: number | null = null
    if (previousMonth > 0) {
      momChangePercent = Math.round((momChange / previousMonth) * 100)
    }

    return {
      mainCategory,
      actual,
      previousMonth,
      momChange,
      momChangePercent
    }
  })
})

const savingsOverrideModel = computed({
  get: () => month.value.plannedSavingsOverride ?? null,
  set: (value: number | null) => budgetStore.setPlannedSavingsOverride(selectedMonthId.value, value)
})

type BudgetStatCard = {
  key: string
  label: string
  value: string
  valueClass?: string
}

const budgetStats = computed<BudgetStatCard[]>(() => [{
  key: 'income',
  label: 'Income',
  value: formatCurrency(plannedIncomeTotal.value)
}, {
  key: 'actual-income',
  label: 'Actual income',
  value: formatCurrency(actualIncome.value)
}, {
  key: 'spent',
  label: 'Spent',
  value: formatCurrency(actualSpent.value)
}, {
  key: 'net',
  label: 'Net',
  value: formatCurrency(actualNet.value),
  valueClass: actualNet.value >= 0 ? 'text-success' : 'text-error'
}])
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-6 w-full">
    <UPageCard
      title="Monthly budget"
      description="Track your income and spending by category."
      variant="naked"
      class="mb-2"
    />

    <UPageCard variant="subtle">
      <div class="flex flex-col gap-4">
        <!-- Month selector - dropdown on smaller screens, tabs on larger screens -->
        <div class="xl:hidden">
          <USelect v-model="selectedMonthId" :items="monthTabItems" class="w-full" />
        </div>
        <div class="hidden xl:block overflow-x-auto">
          <UTabs v-model="selectedMonthId" :items="monthTabItems" class="w-full min-w-max" />
        </div>

        <!-- Stats cards - shrink on phones, bento on larger screens -->
        <div class="grid grid-cols-1 min-[360px]:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
          <UCard v-for="stat in budgetStats" :key="stat.key">
            <p class="text-xs text-muted uppercase mb-1.5">
              {{ stat.label }}
            </p>
            <p :class="['text-lg sm:text-xl xl:text-2xl font-semibold', stat.valueClass ?? 'text-highlighted']">
              {{ stat.value }}
            </p>
          </UCard>
        </div>

        <USeparator />

        <!-- Income & Commitments - two columns on larger screens -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-4 flex-wrap">
                <h3 class="text-sm font-medium text-highlighted">
                  Income
                </h3>
                <UButton
                  color="neutral"
                  icon="i-lucide-plus"
                  size="sm"
                  class="w-fit"
                  @click="budgetStore.addIncomeLine(selectedMonthId)"
                >
                  <span class="hidden sm:inline">Add income</span>
                </UButton>
              </div>
            </template>

            <div class="flex flex-col gap-3">
              <!-- Fixed Salary row -->
              <div class="flex flex-col gap-3">
                <UFormField name="income-salary-name" label="Name" class="w-full">
                  <UInput model-value="Salary" disabled />
                </UFormField>

                <UFormField name="income-salary-amount" label="Amount" class="w-full">
                  <UInput
                    :model-value="month.income[0]?.amount ?? 0"
                    type="number"
                    step="10"
                    :disabled="!month.income[0]"
                    @update:model-value="(value) => {
                      const incomeLine = month.income[0]
                      if (incomeLine) {
                        budgetStore.updateIncomeLine(selectedMonthId, incomeLine.id, { amount: value })
                      }
                    }"
                  />
                </UFormField>
              </div>

              <!-- Additional income lines -->
              <div
                v-for="line in month.income.slice(1)"
                :key="line.id"
                class="flex flex-col gap-3 pt-3 border-t border-default/50"
              >
                <UFormField :name="`income-name-${line.id}`" label="Name" class="w-full">
                  <UInput
                    :model-value="line.name"
                    placeholder="Bonus, side income, etc."
                    @update:model-value="budgetStore.updateIncomeLine(selectedMonthId, line.id, { name: $event })"
                  />
                </UFormField>

                <div class="flex items-end gap-3 min-w-0">
                  <UFormField :name="`income-amount-${line.id}`" label="Amount" class="flex-1 min-w-0">
                    <UInput
                      :model-value="line.amount"
                      type="number"
                      step="10"
                      @update:model-value="budgetStore.updateIncomeLine(selectedMonthId, line.id, { amount: $event })"
                    />
                  </UFormField>

                  <UButton
                    color="neutral"
                    variant="ghost"
                    icon="i-lucide-trash-2"
                    class="shrink-0"
                    @click="budgetStore.removeIncomeLine(selectedMonthId, line.id)"
                  />
                </div>
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
                    @click="budgetStore.setPlannedSavingsOverride(selectedMonthId, null)"
                  />
                </div>
              </UFormField>

              <div class="text-sm space-y-2">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted">Wants (this month)</span>
                  <span class="text-highlighted font-medium">{{ formatCurrency(plannedWantsTotal) }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted">Debt payments (from Plans)</span>
                  <span class="text-highlighted font-medium">{{ formatCurrency(totalDebtPaymentsPerMonth) }}</span>
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
                  Wants ({{ format(new Date(`${selectedMonthId}-01T00:00:00`), 'MMM yyyy') }})
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
                          <UBadge
                            v-if="want.invested"
                            color="success"
                            variant="subtle"
                            size="sm"
                          >
                            Invested
                          </UBadge>
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
                            const amount = value == null ? null : Number(value)
                            budgetStore.setWantOverride(selectedMonthId, want.id, { amountOverride: amount !== null && Number.isFinite(amount) ? amount : null })
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
                          @update:model-value="value => budgetStore.setWantOverride(selectedMonthId, want.id, { disabled: Boolean(value) })"
                        />
                      </UFormField>

                      <UButton
                        color="neutral"
                        variant="ghost"
                        icon="i-lucide-rotate-ccw"
                        class="shrink-0"
                        @click="budgetStore.clearWantOverride(selectedMonthId, want.id)"
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
                            <UBadge
                              v-if="want.invested"
                              color="success"
                              variant="subtle"
                              size="sm"
                            >
                              Invested
                            </UBadge>
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
                              const amount = value == null ? null : Number(value)
                              budgetStore.setWantOverride(selectedMonthId, want.id, { amountOverride: amount !== null && Number.isFinite(amount) ? amount : null })
                            }"
                          />
                        </td>
                        <td class="py-2.5 text-center">
                          <USwitch
                            :model-value="Boolean(month.wantOverrides?.[want.id]?.disabled)"
                            @update:model-value="value => budgetStore.setWantOverride(selectedMonthId, want.id, { disabled: Boolean(value) })"
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
                            @click="budgetStore.clearWantOverride(selectedMonthId, want.id)"
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
        </div>
      </div>
    </UPageCard>

    <div v-if="fetchError" class="text-sm text-error">
      Failed to load transaction data. Please try refreshing the page.
    </div>

    <!-- Spending breakdown - stack on mobile, 2 cols on xl+ -->
    <div v-else-if="subcategoryBreakdown.length" class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <!-- Main Categories Table -->
      <UCard>
        <template #header>
          <h3 class="text-sm font-medium text-highlighted">
            Spending by category
          </h3>
        </template>

        <div class="sm:hidden divide-y divide-default/50">
          <div
            v-for="row in mainCategoryBreakdown"
            :key="row.mainCategory"
            class="py-2.5 flex items-start justify-between gap-3"
          >
            <div class="min-w-0">
              <div class="text-sm text-highlighted font-medium capitalize truncate">
                {{ row.mainCategory }}
              </div>
              <div class="text-xs text-muted">
                {{ previousMonthLabel }}: {{ formatCurrency(row.previousMonth) }}
              </div>
            </div>

            <div class="text-right shrink-0">
              <div class="text-sm text-highlighted font-medium whitespace-nowrap">
                {{ formatCurrency(row.actual) }}
              </div>
              <div class="text-xs whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1 font-medium"
                  :class="{
                    'text-success': row.momChange < 0,
                    'text-error': row.momChange > 0,
                    'text-muted': row.momChange === 0
                  }"
                >
                  <UIcon
                    v-if="row.momChange !== 0"
                    :name="row.momChange > 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                    class="size-3.5"
                  />
                  <template v-if="row.momChangePercent !== null">
                    {{ row.momChange > 0 ? '+' : '' }}{{ row.momChangePercent }}%
                  </template>
                  <template v-else-if="row.actual > 0 && row.previousMonth === 0">New</template>
                  <template v-else>—</template>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="hidden sm:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default text-xs text-muted uppercase">
                <th class="py-2 text-left font-medium">
                  Category
                </th>
                <th class="py-2 text-right font-medium">
                  Spent
                </th>
                <th class="py-2 text-right font-medium">
                  {{ previousMonthLabel }}
                </th>
                <th class="py-2 text-right font-medium">
                  MoM
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in mainCategoryBreakdown"
                :key="row.mainCategory"
                class="border-b border-default/50"
              >
                <td class="py-2.5 text-highlighted font-medium capitalize">
                  {{ row.mainCategory }}
                </td>
                <td class="py-2.5 text-right text-highlighted font-medium whitespace-nowrap">
                  {{ formatCurrency(row.actual) }}
                </td>
                <td class="py-2.5 text-right text-dimmed whitespace-nowrap">
                  {{ formatCurrency(row.previousMonth) }}
                </td>
                <td class="py-2.5 text-right whitespace-nowrap">
                  <span
                    class="inline-flex items-center gap-1 font-medium"
                    :class="{
                      'text-success': row.momChange < 0,
                      'text-error': row.momChange > 0,
                      'text-muted': row.momChange === 0
                    }"
                  >
                    <UIcon
                      v-if="row.momChange !== 0"
                      :name="row.momChange > 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                      class="size-3.5"
                    />
                    <template v-if="row.momChangePercent !== null">
                      {{ row.momChange > 0 ? '+' : '' }}{{ row.momChangePercent }}%
                    </template>
                    <template v-else-if="row.actual > 0 && row.previousMonth === 0">New</template>
                    <template v-else>—</template>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <!-- Subcategories Table -->
      <UCard>
        <template #header>
          <h3 class="text-sm font-medium text-highlighted">
            Detailed breakdown
          </h3>
        </template>

        <div class="sm:hidden divide-y divide-default/50">
          <div
            v-for="row in subcategoryBreakdown"
            :key="row.subcategory"
            class="py-2.5 flex items-start justify-between gap-3"
          >
            <div class="min-w-0">
              <div class="text-sm text-highlighted capitalize truncate">
                {{ row.subcategory }}
              </div>

              <div class="mt-1 flex items-center gap-2 flex-wrap">
                <UBadge
                  :color="row.mainCategory === 'needs' ? 'info' : row.mainCategory === 'wants' ? 'warning' : 'success'"
                  variant="subtle"
                  size="sm"
                >
                  {{ row.mainCategory }}
                </UBadge>
                <span class="text-xs text-muted">
                  {{ previousMonthLabel }}: {{ formatCurrency(row.previousMonth) }}
                </span>
              </div>
            </div>

            <div class="text-right shrink-0">
              <div class="text-sm text-highlighted font-medium whitespace-nowrap">
                {{ formatCurrency(row.actual) }}
              </div>
              <div class="text-xs whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1 font-medium"
                  :class="{
                    'text-success': row.momChange < 0,
                    'text-error': row.momChange > 0,
                    'text-muted': row.momChange === 0
                  }"
                >
                  <UIcon
                    v-if="row.momChange !== 0"
                    :name="row.momChange > 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                    class="size-3.5"
                  />
                  <template v-if="row.momChangePercent !== null">
                    {{ row.momChange > 0 ? '+' : '' }}{{ row.momChangePercent }}%
                  </template>
                  <template v-else-if="row.actual > 0 && row.previousMonth === 0">New</template>
                  <template v-else>—</template>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="hidden sm:block overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-default text-xs text-muted uppercase">
                <th class="py-2 text-left font-medium">
                  Subcategory
                </th>
                <th class="py-2 text-right font-medium">
                  Type
                </th>
                <th class="py-2 text-right font-medium">
                  Spent
                </th>
                <th class="py-2 text-right font-medium">
                  MoM
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in subcategoryBreakdown"
                :key="row.subcategory"
                class="border-b border-default/50"
              >
                <td class="py-2 text-muted capitalize">
                  {{ row.subcategory }}
                </td>
                <td class="py-2 text-right">
                  <UBadge
                    :color="row.mainCategory === 'needs' ? 'info' : row.mainCategory === 'wants' ? 'warning' : 'success'"
                    variant="subtle"
                    size="sm"
                  >
                    {{ row.mainCategory }}
                  </UBadge>
                </td>
                <td class="py-2 text-right text-highlighted font-medium whitespace-nowrap">
                  {{ formatCurrency(row.actual) }}
                </td>
                <td class="py-2 text-right whitespace-nowrap">
                  <span
                    class="inline-flex items-center gap-1 font-medium"
                    :class="{
                      'text-success': row.momChange < 0,
                      'text-error': row.momChange > 0,
                      'text-muted': row.momChange === 0
                    }"
                  >
                    <UIcon
                      v-if="row.momChange !== 0"
                      :name="row.momChange > 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                      class="size-3.5"
                    />
                    <template v-if="row.momChangePercent !== null">
                      {{ row.momChange > 0 ? '+' : '' }}{{ row.momChangePercent }}%
                    </template>
                    <template v-else-if="row.actual > 0 && row.previousMonth === 0">New</template>
                    <template v-else>—</template>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </div>

    <div v-else class="text-sm text-muted">
      Import transactions to see spending breakdown.
    </div>
  </div>
</template>
