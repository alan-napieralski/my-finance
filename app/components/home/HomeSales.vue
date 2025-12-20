<script setup lang="ts">
import { h, resolveComponent } from 'vue'
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

type SortField = 'date' | 'amount' | 'balance'
type SortDirection = 'asc' | 'desc'

const searchQuery = ref('')
const selectedCategories = ref<string[]>([])
const sortField = ref<SortField>('date')
const sortDirection = ref<SortDirection>('desc')

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

const { data: allTransactions } = await useAsyncData<TransactionRow[]>('finance-transactions', async () => {
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

  return filtered
}, {
  watch: [() => props.period, () => props.range],
  default: () => []
})

const availableCategories = computed(() => {
  const categories = new Set<string>()
  allTransactions.value.forEach((tx) => {
    if (tx.category) {
      categories.add(tx.category)
    }
  })
  return Array.from(categories).sort()
})

const filteredAndSortedData = computed(() => {
  let result = allTransactions.value

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(tx => tx.description.toLowerCase().includes(query))
  }

  // Filter by categories
  if (selectedCategories.value.length > 0) {
    result = result.filter(tx => tx.category && selectedCategories.value.includes(tx.category))
  }

  // Sort
  result = [...result].sort((a, b) => {
    let aValue: number
    let bValue: number

    if (sortField.value === 'date') {
      aValue = new Date(a.date).getTime()
      bValue = new Date(b.date).getTime()
    } else if (sortField.value === 'amount') {
      aValue = a.amount
      bValue = b.amount
    } else {
      aValue = a.balance ?? 0
      bValue = b.balance ?? 0
    }

    return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue
  })

  return result
})

const toggleSort = (field: SortField) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
}

const columns: TableColumn<TransactionRow>[] = [
  {
    accessorKey: 'date',
    header: () => {
      const UIcon = resolveComponent('UIcon')
      return h('button', {
        class: 'flex items-center gap-1.5 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer px-2 py-1 -mx-2 -my-1 rounded',
        onClick: () => toggleSort('date')
      }, [
        'Date',
        h(UIcon, {
          name: sortField.value === 'date'
            ? (sortDirection.value === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down')
            : 'i-lucide-arrow-up-down',
          class: sortField.value === 'date' ? 'size-4 text-primary' : 'size-4'
        })
      ])
    },
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
    header: () => {
      const UIcon = resolveComponent('UIcon')
      return h('button', {
        class: 'flex items-center gap-1.5 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer ml-auto px-2 py-1 -mx-2 -my-1 rounded',
        onClick: () => toggleSort('amount')
      }, [
        'Amount',
        h(UIcon, {
          name: sortField.value === 'amount'
            ? (sortDirection.value === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down')
            : 'i-lucide-arrow-up-down',
          class: sortField.value === 'amount' ? 'size-4 text-primary' : 'size-4'
        })
      ])
    },
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
    header: () => {
      const UIcon = resolveComponent('UIcon')
      return h('button', {
        class: 'flex items-center gap-1.5 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer ml-auto px-2 py-1 -mx-2 -my-1 rounded',
        onClick: () => toggleSort('balance')
      }, [
        'Balance',
        h(UIcon, {
          name: sortField.value === 'balance'
            ? (sortDirection.value === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down')
            : 'i-lucide-arrow-up-down',
          class: sortField.value === 'balance' ? 'size-4 text-primary' : 'size-4'
        })
      ])
    },
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
  <div class="flex flex-col gap-4">
    <!-- Filters -->
    <UCard>
      <div class="flex flex-col sm:flex-row gap-3">
        <UInput
          v-model="searchQuery"
          icon="i-lucide-search"
          placeholder="Search by description..."
          class="flex-1"
        />

        <div class="flex items-center gap-2 w-full sm:w-auto">
          <USelectMenu
            v-model="selectedCategories"
            :items="availableCategories"
            multiple
            placeholder="Filter by category"
            class="flex-1 sm:w-64"
          >
            <span v-if="selectedCategories.length === 0">All categories</span>
            <span v-else>{{ selectedCategories.length }} selected</span>
          </USelectMenu>

          <UButton
            v-if="selectedCategories.length > 0"
            color="neutral"
            variant="ghost"
            icon="i-lucide-x"
            square
            @click="selectedCategories = []"
          />
        </div>
      </div>
    </UCard>

    <!-- Table -->
    <UTable
      :data="filteredAndSortedData"
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
  </div>
</template>
