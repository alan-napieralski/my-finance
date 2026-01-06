<script setup lang="ts">
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Period, Range, TransactionRow, SortField, SortDirection, TransactionsResponse } from '~/types'
import { useTransactionsApi } from '~/composables/finance/useTransactionsApi'

const props = defineProps<{
  period: Period
  range: Range
}>()

const { fetchTransactions } = useTransactionsApi()

const searchQuery = ref('')
const selectedCategories = ref<string[]>([])
const sortField = ref<SortField>('date')
const sortDirection = ref<SortDirection>('desc')

const { data: allTransactions } = await useAsyncData<TransactionRow[]>('finance-transactions', async () => {
  try {
    const response: TransactionsResponse = await fetchTransactions(props.range)

    return response.data
  } catch (error) {
    console.error('[HomeSales] failed to fetch /api/transactions', error)
    return []
  }
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
      // For balance sorting: items without balance go to the end
      const aHasBalance = a.balance != null
      const bHasBalance = b.balance != null

      if (!aHasBalance && !bHasBalance) return 0
      if (!aHasBalance) return 1
      if (!bHasBalance) return -1

      aValue = a.balance!
      bValue = b.balance!
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

const createSortableHeader = useSortableHeader(sortField, sortDirection, toggleSort)

const columns: TableColumn<TransactionRow>[] = [
  {
    accessorKey: 'date',
    header: () => createSortableHeader('date', 'Date'),
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
    header: () => createSortableHeader('amount', 'Amount', true),
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
    header: () => createSortableHeader('balance', 'Balance', true),
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
    <div class="overflow-x-auto -mx-4 sm:mx-0">
      <div class="inline-block min-w-full align-middle">
        <div class="overflow-hidden">
          <UTable
            :data="filteredAndSortedData"
            :columns="columns"
            class="shrink-0"
            :ui="{
              base: 'table-auto sm:table-fixed border-separate border-spacing-0 min-w-full',
              thead: '[&>tr]:bg-elevated/50 [&>tr]:after:content-none',
              tbody: '[&>tr]:last:[&>td]:border-b-0',
              th: 'first:rounded-l-lg last:rounded-r-lg border-y border-default first:border-l last:border-r whitespace-nowrap',
              td: 'border-b border-default'
            }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
