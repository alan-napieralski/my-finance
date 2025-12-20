<script setup lang="ts">
import { endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import type { TabsItem } from '@nuxt/ui'
import { storeToRefs } from 'pinia'
import { usePlansStore } from '~/stores/plans'
import { useBudgetStore } from '~/stores/budget'
import { parseTransactionDate } from '~/utils/dateParser'
import { formatCurrency } from '~/utils/currency'

type FinanceTransactionPayload = {
  date: string
  amount: string | number
  category?: string
  description?: string
}

type FinanceEntry = {
  id: string
  timestamp: string
  data: { transactions?: FinanceTransactionPayload[] } | FinanceTransactionPayload[]
}

type Transaction = {
  date: Date
  amount: number
  category: string
  description: string
}

type MainCategory = 'wants' | 'needs' | 'savings'

type SubcategorySummary = {
  subcategory: string
  mainCategory: MainCategory
  actual: number
  previousMonth: number
  momChange: number
  momChangePercent: number | null
}

type MainCategorySummary = {
  mainCategory: MainCategory
  actual: number
  previousMonth: number
  momChange: number
  momChangePercent: number | null
}

// Map subcategories to main categories
const subcategoryToMainCategory: Record<string, MainCategory> = {
  // Needs
  'bills': 'needs',
  'subscriptions': 'needs',
  'groceries': 'needs',
  'transport': 'needs',
  'recurring': 'needs',
  'eating out': 'needs',
  // Wants
  'sport and hobbies': 'wants',
  'shopping': 'wants',
  'other': 'wants',
  'uncategorized': 'wants',
  // Savings
  'savings': 'savings',
  'transfers': 'savings'
}

const getMainCategory = (subcategory: string): MainCategory => {
  const key = subcategory.toLowerCase()
  return subcategoryToMainCategory[key] ?? 'wants'
}

const plansStore = usePlansStore()
const budgetStore = useBudgetStore()

const {
  savings,
  totalSavingsPerMonth,
  totalWantsPerMonth,
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

const plannedCommitmentsTotal = computed(() => {
  return plannedSavings.value
    + totalWantsPerMonth.value
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
      } else if (actual > 0) {
        momChangePercent = 100
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
  const mainCategories: MainCategory[] = ['needs', 'wants', 'savings']

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
    } else if (actual > 0) {
      momChangePercent = 100
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
        <UTabs v-model="selectedMonthId" :items="monthTabItems" class="w-full" />

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <UCard>
            <p class="text-xs text-muted uppercase mb-1.5">
              Income
            </p>
            <p class="text-2xl font-semibold text-highlighted">
              {{ formatCurrency(plannedIncomeTotal) }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs text-muted uppercase mb-1.5">
              Actual income
            </p>
            <p class="text-2xl font-semibold text-highlighted">
              {{ formatCurrency(actualIncome) }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs text-muted uppercase mb-1.5">
              Spent
            </p>
            <p class="text-2xl font-semibold text-highlighted">
              {{ formatCurrency(actualSpent) }}
            </p>
          </UCard>
          <UCard>
            <p class="text-xs text-muted uppercase mb-1.5">
              Net
            </p>
            <p
              class="text-2xl font-semibold"
              :class="actualNet >= 0 ? 'text-success' : 'text-error'"
            >
              {{ formatCurrency(actualNet) }}
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
              <!-- Fixed Salary row -->
              <div class="flex flex-wrap items-end gap-3">
                <UFormField name="income-salary-name" label="Name" class="flex-1 min-w-[10rem]">
                  <UInput model-value="Salary" disabled />
                </UFormField>

                <UFormField name="income-salary-amount" label="Amount" class="w-full sm:w-40">
                  <UInput
                    :model-value="month.income[0]?.amount ?? 0"
                    type="number"
                    step="10"
                    @update:model-value="budgetStore.updateIncomeLine(selectedMonthId, month.income[0]!.id, { amount: $event })"
                  />
                </UFormField>

                <div class="w-8" />
              </div>

              <!-- Additional income lines -->
              <div
                v-for="line in month.income.slice(1)"
                :key="line.id"
                class="flex flex-wrap items-end gap-3"
              >
                <UFormField :name="`income-name-${line.id}`" label="Name" class="flex-1 min-w-[10rem]">
                  <UInput v-model="line.name" placeholder="Bonus, side income, etc." />
                </UFormField>

                <UFormField :name="`income-amount-${line.id}`" label="Amount" class="w-full sm:w-40">
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

    <div v-if="fetchError" class="text-sm text-error">
      Failed to load transaction data. Please try refreshing the page.
    </div>

    <div v-else-if="subcategoryBreakdown.length" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Main Categories Table -->
      <UCard>
        <template #header>
          <h3 class="text-sm font-medium text-highlighted">
            Spending by category
          </h3>
        </template>

        <div class="flex flex-col">
          <!-- Header row -->
          <div class="flex items-center gap-3 py-2 border-b border-default text-xs text-muted uppercase">
            <div class="flex-1">
              Category
            </div>
            <div class="w-24 text-right">
              Spent
            </div>
            <div class="w-20 text-right">
              {{ previousMonthLabel }}
            </div>
            <div class="w-20 text-right">
              MoM
            </div>
          </div>

          <!-- Data rows -->
          <div
            v-for="row in mainCategoryBreakdown"
            :key="row.mainCategory"
            class="flex items-center gap-3 py-2.5 border-b border-default/50 text-sm"
          >
            <div class="flex-1 text-highlighted font-medium capitalize">
              {{ row.mainCategory }}
            </div>

            <div class="w-24 text-right text-highlighted font-medium">
              {{ formatCurrency(row.actual) }}
            </div>

            <div class="w-20 text-right text-dimmed">
              {{ formatCurrency(row.previousMonth) }}
            </div>

            <div
              class="w-20 text-right font-medium flex items-center justify-end gap-1"
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
              <template v-else>
                —
              </template>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Subcategories Table -->
      <UCard>
        <template #header>
          <h3 class="text-sm font-medium text-highlighted">
            Detailed breakdown
          </h3>
        </template>

        <div class="flex flex-col">
          <!-- Header row -->
          <div class="flex items-center gap-3 py-2 border-b border-default text-xs text-muted uppercase">
            <div class="flex-1">
              Subcategory
            </div>
            <div class="w-16 text-right">
              Type
            </div>
            <div class="w-24 text-right">
              Spent
            </div>
            <div class="w-20 text-right">
              MoM
            </div>
          </div>

          <!-- Data rows -->
          <div
            v-for="row in subcategoryBreakdown"
            :key="row.subcategory"
            class="flex items-center gap-3 py-2 border-b border-default/50 text-sm"
          >
            <div class="flex-1 text-muted capitalize truncate">
              {{ row.subcategory }}
            </div>

            <div class="w-16 text-right">
              <UBadge
                :color="row.mainCategory === 'needs' ? 'info' : row.mainCategory === 'wants' ? 'warning' : 'success'"
                variant="subtle"
                size="xs"
              >
                {{ row.mainCategory }}
              </UBadge>
            </div>

            <div class="w-24 text-right text-highlighted font-medium">
              {{ formatCurrency(row.actual) }}
            </div>

            <div
              class="w-20 text-right font-medium flex items-center justify-end gap-1"
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
              <template v-else>
                —
              </template>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <div v-else class="text-sm text-muted">
      Import transactions to see spending breakdown.
    </div>
  </div>
</template>
