<script setup lang="ts">
import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, format, startOfMonth, startOfWeek } from 'date-fns'
import { VisXYContainer, VisLine, VisAxis, VisArea, VisCrosshair, VisTooltip } from '@unovis/vue'
import type { Period, Range, FinanceEntry } from '~/types'
import { parseFinanceTransactions } from '~/utils/finance/transactions'

const cardRef = useTemplateRef<HTMLElement | null>('cardRef')

const props = defineProps<{
  period: Period
  range: Range
}>()

type DataRecord = {
  date: Date
  amount: number
}

const { width } = useElementSize(cardRef)

const data = ref<DataRecord[]>([])
const latestEntry = ref<FinanceEntry | null>(null)

const { fetchLatest } = useFinanceData()

const POLL_INTERVAL_MS = 10000
let pollId: number | null = null

const buildChartData = () => {
  if (!latestEntry.value) {
    data.value = []
    return
  }

  const transactions = parseFinanceTransactions(latestEntry.value).filter(({ date }) => {
    return date >= props.range.start && date <= props.range.end
  })

  const bucketKey = (date: Date): string => {
    if (props.period === 'daily') {
      return format(date, 'yyyy-MM-dd')
    }

    if (props.period === 'weekly') {
      return format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    }

    return format(startOfMonth(date), 'yyyy-MM')
  }

  const buckets = new Map<string, number>()

  for (const tx of transactions) {
    const key = bucketKey(tx.date)
    const previous = buckets.get(key) ?? 0
    const spent = tx.amount < 0 ? Math.abs(tx.amount) : 0

    buckets.set(key, previous + spent)
  }

  const dates
    = props.period === 'daily'
      ? eachDayOfInterval(props.range)
      : props.period === 'weekly'
        ? eachWeekOfInterval(props.range, { weekStartsOn: 1 })
        : eachMonthOfInterval(props.range)

  data.value = dates.map(date => ({
    date,
    amount: buckets.get(bucketKey(date)) ?? 0
  }))
}

const loadLatest = async () => {
  const { data: latest, error } = await fetchLatest()

  if (error) {
    latestEntry.value = null
    return
  }

  latestEntry.value = (latest ?? null) as FinanceEntry | null
}

onMounted(async () => {
  await loadLatest()

  // Poll so that when n8n posts new data to /api/finance/webhook,
  // the chart picks up the latest entry without a manual reload.
  pollId = window.setInterval(() => {
    loadLatest()
  }, POLL_INTERVAL_MS)
})

onUnmounted(() => {
  if (pollId !== null) {
    clearInterval(pollId)
    pollId = null
  }
})

watch([() => props.period, () => props.range, latestEntry], () => {
  buildChartData()
}, { immediate: true })

const x = (_: DataRecord, i: number) => i
const y = (d: DataRecord) => d.amount

const total = computed(() => data.value.reduce((acc: number, { amount }) => acc + amount, 0))

const formatNumber = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format

const formatDate = (date: Date): string => {
  return ({
    daily: format(date, 'd MMM'),
    weekly: format(date, 'd MMM'),
    monthly: format(date, 'MMM yyy')
  })[props.period]
}

const xTicks = (i: number) => {
  if (i === 0 || i === data.value.length - 1 || !data.value[i]) {
    return ''
  }

  return formatDate(data.value[i].date)
}

const template = (d: DataRecord) => `${formatDate(d.date)}: ${formatNumber(d.amount)}`
</script>

<template>
  <UCard ref="cardRef" :ui="{ root: 'overflow-visible', body: '!px-0 !pt-0 !pb-3' }">
    <template #header>
      <div>
        <p class="text-xs text-muted uppercase mb-1.5">
          Spending
        </p>
        <p class="text-3xl text-highlighted font-semibold">
          {{ formatNumber(total) }}
        </p>
      </div>
    </template>

    <VisXYContainer
      :data="data"
      :padding="{ top: 40 }"
      class="h-96"
      :width="width"
    >
      <VisLine
        :x="x"
        :y="y"
        color="var(--ui-primary)"
      />
      <VisArea
        :x="x"
        :y="y"
        color="var(--ui-primary)"
        :opacity="0.1"
      />

      <VisAxis
        type="x"
        :x="x"
        :tick-format="xTicks"
      />

      <VisCrosshair
        color="var(--ui-primary)"
        :template="template"
      />

      <VisTooltip />
    </VisXYContainer>
  </UCard>
</template>

<style scoped>
.unovis-xy-container {
  --vis-crosshair-line-stroke-color: var(--ui-primary);
  --vis-crosshair-circle-stroke-color: var(--ui-bg);

  --vis-axis-grid-color: var(--ui-border);
  --vis-axis-tick-color: var(--ui-border);
  --vis-axis-tick-label-color: var(--ui-text-dimmed);

  --vis-tooltip-background-color: var(--ui-bg);
  --vis-tooltip-border-color: var(--ui-border);
  --vis-tooltip-text-color: var(--ui-text-highlighted);
}
</style>
