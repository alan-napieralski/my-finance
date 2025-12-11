<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Period, Range } from '~/types'
import { parseTransactionDate } from '~/utils/dateParser'

const props = defineProps<{
  period: Period
  range: Range
}>()

type FinanceEntry = {
  id: string
  timestamp: string
  data: Record<string, unknown>
}

type TransactionRow = {
  id: string
  date: string
  description: string
  category?: string
  amount: number
  balance?: number
}

const extractTransactions = (entry: FinanceEntry | null): TransactionRow[] => {
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
    .map((item: unknown, index: number) => {
      const record = item as Record<string, unknown>
      const date = parseTransactionDate(record.date as string)
      const amount = typeof record.amount === 'string' ? Number.parseFloat(record.amount) : Number(record.amount)
      const balance = record.balance != null ? Number(record.balance) : undefined

      if (!date || Number.isNaN(amount)) {
        return null
      }

      const result: TransactionRow = {
        id: String(record.id ?? index),
        date: date.toISOString(),
        description: (record.description as string) ?? '',
        amount,
        balance
      }

      if (record.category != null) {
        result.category = record.category as string
      }

      return result
    })
    .filter((item): item is TransactionRow => item !== null)
}

const { data } = await useAsyncData<TransactionRow[]>('finance-transactions', async () => {
  let latest: FinanceEntry | null = null

  try {
    latest = await $fetch<FinanceEntry>('/api/finance/latest')
  } catch (error) {
    console.error('[HomeSales] failed to fetch /api/finance/latest', error)
    return []
  }

  const all = extractTransactions(latest)

  const filtered = all.filter((tx) => {
    const date = new Date(tx.date)
    return date >= props.range.start && date <= props.range.end
  })

  return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}, {
  watch: [() => props.period, () => props.range],
  default: () => []
})

const columns: TableColumn<TransactionRow>[] = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }) => {
      return new Date(row.getValue('date') as string).toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    }
  },
  {
    accessorKey: 'description',
    header: 'Description'
  },
  {
    accessorKey: 'category',
    header: 'Category'
  },
  {
    accessorKey: 'amount',
    header: () => h('div', { class: 'text-right' }, 'Amount'),
    cell: ({ row }) => {
      const amount = Number(row.getValue('amount'))

      const formatted = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
      }).format(amount)

      return h('div', { class: 'text-right font-medium' }, formatted)
    }
  },
  {
    accessorKey: 'balance',
    header: () => h('div', { class: 'text-right' }, 'Balance'),
    cell: ({ row }) => {
      const balance = row.getValue('balance')
      if (balance == null || balance === '') {
        return null
      }

      const value = Number(balance)
      if (Number.isNaN(value)) {
        return null
      }

      const formatted = new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP'
      }).format(value)

      return h('div', { class: 'text-right font-medium' }, formatted)
    }
  }
]
</script>

<template>
  <UTable
    :data="data"
    :columns="columns"
    class="shrink-0"
    :ui="{
      base: 'table-fixed border-separate border-spacing-0',
      thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
      tbody: '[&>tr]:last:[&>td]:border-b-0',
      th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r',
      td: 'border-b border-default'
    }"
  />
</template>
