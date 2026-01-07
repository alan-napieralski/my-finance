<script setup lang="ts">
import type { Period, Range, Stat, TransactionsResponse } from '~/types'
import { formatCurrency } from '~/utils/currency'
import { useTransactionsApi } from '~/composables/finance/useTransactionsApi'

const props = defineProps<{
  period: Period
  range: Range
}>()

const { fetchTransactions } = useTransactionsApi()

const { data: stats } = await useAsyncData<Stat[]>('stats', async () => {
  let response: TransactionsResponse

  try {
    response = await fetchTransactions(props.range)
  } catch (error) {
    console.error('[HomeStats] failed to fetch /api/transactions', error)
    return []
  }

  const transactions = response.data

  const totalTransactions = transactions.length

  const totalSpent = transactions.reduce((sum, tx) => {
    return sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0)
  }, 0)

  const netAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0)

  const metrics: Stat[] = [
    {
      title: 'Total Saved Up',
      icon: 'i-lucide-piggy-bank',
      value: formatCurrency(netAmount),
      variation: 0
    },
    {
      title: 'Total Transactions',
      icon: 'i-lucide-list-ordered',
      value: totalTransactions,
      variation: 0
    },
    {
      title: 'Prediction Difference',
      icon: 'i-lucide-sparkles',
      value: 'Coming soon',
      variation: 0
    },
    {
      title: 'Total Spent',
      icon: 'i-lucide-credit-card',
      value: formatCurrency(totalSpent),
      variation: 0
    }
  ]

  return metrics
}, {
  watch: [() => props.period, () => props.range],
  default: () => []
})
</script>

<template>
  <UPageGrid class="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard
      v-for="(stat, index) in stats"
      :key="index"
      :icon="stat.icon"
      :title="stat.title"
      variant="subtle"
      :ui="{
        container: 'gap-y-1.5',
        wrapper: 'items-start',
        leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
        title: 'font-normal text-muted text-xs uppercase'
      }"
      class="lg:rounded-none lg:first:rounded-l-lg lg:last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>

        <UBadge
          v-if="stat.variation !== 0"
          :color="stat.variation > 0 ? 'success' : 'error'"
          variant="subtle"
          class="text-xs"
        >
          {{ stat.variation > 0 ? '+' : '' }}{{ stat.variation }}%
        </UBadge>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
