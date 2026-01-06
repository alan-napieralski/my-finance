<script setup lang="ts">
import type { TransactionRow, TransactionsResponse } from '~/types'
import { useBudgetMonthTabs } from '~/composables/budget/useBudgetMonthTabs'
import { useSpendingBreakdown } from '~/composables/budget/useSpendingBreakdown'
import { useTransactionsApi } from '~/composables/finance/useTransactionsApi'
import { useBudgetStore } from '~/stores/budget'
import { formatCurrency } from '~/utils/currency'
import { getMonthRange } from '~/utils/dateRanges'
import { toBudgetTransactionsFromRows } from '~/utils/finance/transactions'

const budgetStore = useBudgetStore()

const {
  monthTabItems,
  selectedMonthId,
  validatedMonthId,
  previousMonthId,
  previousMonthLabel
} = useBudgetMonthTabs()

const month = computed(() => budgetStore.getOrCreateMonth(validatedMonthId.value))

const plannedIncomeTotal = computed(() => {
  return month.value.income.reduce((sum, line) => sum + (line.amount || 0), 0)
})

const { fetchTransactions } = useTransactionsApi()

const monthRange = computed(() => getMonthRange(validatedMonthId.value))
const previousRange = computed(() => getMonthRange(previousMonthId.value))

const transactionsRange = computed(() => ({
  start: previousRange.value.start,
  end: monthRange.value.end
}))

const { data: transactionRows, error: fetchError } = await useAsyncData<TransactionRow[]>('budget-transactions', async () => {
  const response: TransactionsResponse = await fetchTransactions(transactionsRange.value)
  return response.data
}, {
  watch: [validatedMonthId, previousMonthId],
  default: () => []
})

watch(fetchError, (error) => {
  if (error) {
    console.error('[HomeBudgetPlanner] Failed to fetch transactions:', error)
  }
})

const allTransactions = computed(() => toBudgetTransactionsFromRows(transactionRows.value))

const {
  actualIncome,
  actualSpent,
  actualNet,
  subcategoryBreakdown,
  mainCategoryBreakdown
} = useSpendingBreakdown({
  transactions: allTransactions,
  monthId: validatedMonthId,
  previousMonthId
})

// Local UI-only type for stats displayed in this component.
// Kept here rather than in app/types to avoid leaking view-specific concerns.
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
        <BudgetPlannerMonthSelect v-model="selectedMonthId" :items="monthTabItems" />

        <BudgetPlannerStatsCards :stats="budgetStats" />

        <USeparator />

        <!-- Income & Commitments - two columns on larger screens -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <BudgetPlannerIncomeCard :month-id="validatedMonthId" />
          <BudgetPlannerCommitmentsCard :month-id="validatedMonthId" />
        </div>
      </div>
    </UPageCard>

    <BudgetPlannerSpendingBreakdown
      :fetch-error="fetchError"
      :previous-month-label="previousMonthLabel"
      :main-category-breakdown="mainCategoryBreakdown"
      :subcategory-breakdown="subcategoryBreakdown"
    />
  </div>
</template>
