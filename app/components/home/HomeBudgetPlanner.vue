<script setup lang="ts">
import type { BudgetStatCard, TransactionRow, TransactionsResponse } from '~/types'
import { useBudgetMonthTabs } from '~/composables/budget/useBudgetMonthTabs'
import { useSpendingBreakdown } from '~/composables/budget/useSpendingBreakdown'
import { useTransactionsApi } from '~/composables/finance/useTransactionsApi'
import { formatCurrency } from '~/utils/currency'
import { getMonthRange } from '~/utils/dateRanges'
import { toBudgetTransactionsFromRows } from '~/utils/finance/transactions'

const {
  monthTabItems,
  selectedMonthId,
  validatedMonthId,
  previousMonthId,
  previousMonthLabel
} = useBudgetMonthTabs()

const { fetchTransactions } = useTransactionsApi()
const remote = isRemoteApiEnabled()

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
  default: () => [],
  server: !remote
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

const budgetStats = computed<BudgetStatCard[]>(() => [{
  key: 'income',
  label: 'Income',
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

        <BudgetPlannerCommitmentsCard :month-id="validatedMonthId" />
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
