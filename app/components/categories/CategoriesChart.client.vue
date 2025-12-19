<script setup lang="ts">
import { VisSingleContainer, VisDonut, VisTooltip } from '@unovis/vue'
import type { Period, Range } from '~/types'
import { parseTransactionDate } from '~/utils/dateParser'

const props = defineProps<{
  period: Period
  range: Range
}>()

type FinanceTransactionPayload = {
  date: string
  amount: string | number
  category?: string
}

type FinanceEntry = {
  id: string
  timestamp: string
  data: { transactions?: FinanceTransactionPayload[] } | FinanceTransactionPayload[]
}

type CategoryDatum = {
  category: string
  value: number
}

type Transaction = {
  date: Date
  amount: number
  category: string
}

const data = ref<CategoryDatum[]>([])
const latestEntry = ref<FinanceEntry | null>(null)

const { fetchLatest } = useFinanceData()

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

      if (!date || Number.isNaN(amount)) {
        return null
      }

      return { date, amount, category }
    })
    .filter((item): item is Transaction => item !== null)
}

const buildChartData = () => {
  if (!latestEntry.value) {
    data.value = []
    return
  }

  const transactions = extractTransactions(latestEntry.value).filter((tx) => {
    return tx.date >= props.range.start && tx.date <= props.range.end
  })

  const buckets = new Map<string, number>()

  for (const tx of transactions) {
    const spent = tx.amount < 0 ? Math.abs(tx.amount) : 0
    if (spent === 0) continue

    const key = tx.category
    const previous = buckets.get(key) ?? 0
    buckets.set(key, previous + spent)
  }

  data.value = Array.from(buckets.entries()).map(([category, value]) => ({ category, value }))
}

const loadLatest = async () => {
  const { data: latest, error } = await fetchLatest()

  if (!error && latest) {
    latestEntry.value = latest as FinanceEntry
  }
}

onMounted(async () => {
  await loadLatest()
  buildChartData()
})

watch([() => props.period, () => props.range, latestEntry], () => {
  buildChartData()
}, { immediate: true })

const value = (d: CategoryDatum) => d.value
const category = (d: CategoryDatum) => d.category

// Map category names to CSS variables defined in app/assets/css/colors.css
const categoryColorMap: Record<string, string> = {
  'transfers': 'var(--color-category-transfers)',
  'wants': 'var(--color-category-wants)',
  'needs': 'var(--color-category-needs)',
  'bills': 'var(--color-category-bills)',
  'subscriptions': 'var(--color-category-subscriptions)',
  'savings': 'var(--color-category-savings)',
  'income': 'var(--color-category-income)',
  'other': 'var(--color-category-other)',
  'uncategorized': 'var(--color-category-other)',
  'groceries': 'var(--color-category-groceries)',
  'transport': 'var(--color-category-transport)',
  'eating out': 'var(--color-category-eating-out)',
  'sport and hobbies': 'var(--color-category-sport-and-hobbies)',
  'nightout': 'var(--color-category-nightout)'
}

const resolveCategoryKey = (category: string): string => {
  const key = category.trim().toLowerCase()
  return key || 'uncategorized'
}

const resolveCategoryColor = (category: string): string => {
  const key = resolveCategoryKey(category)
  return categoryColorMap[key] ?? 'var(--color-category-other)'
}

const color = (d: CategoryDatum) => resolveCategoryColor(d.category)

const formatNumber = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0
}).format

const tooltipTemplate = (d: CategoryDatum) => `${d.category}: ${formatNumber(d.value)}`
</script>

<template>
  <UCard :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">
          Spending by Category
        </p>
      </div>
    </template>

    <VisSingleContainer
      :data="data"
      class="h-96"
    >
      <VisDonut
        :value="value"
        :category="category"
        :color="color"
      />

      <VisTooltip :template="tooltipTemplate" />
    </VisSingleContainer>

    <div
      v-if="data.length"
      class="px-4 pb-3 flex flex-wrap gap-x-4 gap-y-2 text-sm"
    >
      <div
        v-for="item in data"
        :key="item.category"
        class="flex items-center gap-2"
      >
        <span
          class="inline-block size-3 rounded-full"
          :style="{ backgroundColor: resolveCategoryColor(item.category) }"
        />
        <span class="text-muted">
          {{ item.category }}
        </span>
        <span class="text-dimmed">
          · {{ formatNumber(item.value) }}
        </span>
      </div>
    </div>
  </UCard>
</template>
