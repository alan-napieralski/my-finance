<script setup lang="ts">
import { parse } from 'date-fns'
import type { Period, Range, Stat } from '~/types'

const props = defineProps<{
  period: Period
  range: Range
}>()

type FinanceEntry = {
  id: string
  timestamp: string
  data: any
}

type Transaction = {
  date: Date
  amount: number
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  })
}

const parseTransactionDate = (value: string): Date | null => {
  if (!value) {
    return null
  }

  const parsedDdMmYyyy = parse(value, 'dd/MM/yyyy', new Date())
  if (!Number.isNaN(parsedDdMmYyyy.getTime())) {
    return parsedDdMmYyyy
  }

  const parsedMmDdYyyy = parse(value, 'MM/dd/yyyy', new Date())
  if (!Number.isNaN(parsedMmDdYyyy.getTime())) {
    return parsedMmDdYyyy
  }

  const fallback = new Date(value)
  if (!Number.isNaN(fallback.getTime())) {
    return fallback
  }

  return null
}

const extractTransactions = (entry: FinanceEntry | null): Transaction[] => {
  if (!entry || !entry.data) {
    return []
  }

  const payload = entry.data as any
  const source = Array.isArray(payload.transactions)
    ? payload.transactions
    : Array.isArray(payload)
      ? payload
      : []

  console.log('[HomeStats] raw finance payload', payload)
  console.log('[HomeStats] transactions source', source)

  return source
    .map((item: any) => {
      const date = parseTransactionDate(item.date)
      const amount = typeof item.amount === 'string' ? Number.parseFloat(item.amount) : Number(item.amount)

      if (!date || Number.isNaN(amount)) {
        return null
      }

      return { date, amount }
    })
    .filter((item): item is Transaction => item !== null)
}

const { data: stats } = await useAsyncData<Stat[]>('stats', async () => {
  let latest: FinanceEntry | null = null

  try {
    latest = await $fetch<FinanceEntry>('/api/finance/latest')
  } catch (error) {
    console.error('[HomeStats] failed to fetch /api/finance/latest', error)
    return []
  }

  const all = extractTransactions(latest)

  const transactionsInRange = all.filter((tx) => {
    return tx.date >= props.range.start && tx.date <= props.range.end
  })

  const totalTransactions = transactionsInRange.length

  const totalSpent = transactionsInRange.reduce((sum, tx) => {
    return sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0)
  }, 0)

  const netAmount = transactionsInRange.reduce((sum, tx) => sum + tx.amount, 0)

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
  <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
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
      class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1"
    >
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }}
        </span>

        <UBadge
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
