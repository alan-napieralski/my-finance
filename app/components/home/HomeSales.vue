<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { Period, Range, TransactionRow, SortField, SortDirection, TransactionsResponse } from '~/types'
import { useTransactionsApi } from '~/composables/finance/useTransactionsApi'
import { subcategoryToMainCategory } from '~/utils/budgetCategories'

const props = withDefaults(defineProps<{
  period: Period
  range: Range
  enableCategoryEditing?: boolean
}>(), {
  enableCategoryEditing: false
})

const toast = useToast()

const { fetchTransactions } = useTransactionsApi()
const remote = isRemoteApiEnabled()

const isEditingCategories = ref(false)
const confirmOpen = ref(false)
const isSaving = ref(false)

const originalCategoryById = ref<Record<string, string>>({})
const draftCategoryById = ref<Record<string, string>>({})

const displayCategory = (value: string) => value ? value : 'Uncategorized'

const enterEditMode = () => {
  const original: Record<string, string> = {}
  const draft: Record<string, string> = {}

  allTransactions.value.forEach((tx) => {
    original[tx.id] = tx.category ?? ''
    draft[tx.id] = tx.category ?? ''
  })

  originalCategoryById.value = original
  draftCategoryById.value = draft
  isEditingCategories.value = true
}

const exitEditMode = () => {
  isEditingCategories.value = false
  confirmOpen.value = false
  originalCategoryById.value = {}
  draftCategoryById.value = {}
}

const searchQuery = ref('')
const selectedCategories = ref<string[]>([])
const sortField = ref<SortField>('date')
const sortDirection = ref<SortDirection>('desc')
const page = ref(1)
const pageSize = 25

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
  default: () => [],
  server: !remote
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

const editCategoryItems = computed(() => {
  const items = new Set<string>()

  // Known budget categories
  Object.keys(subcategoryToMainCategory).forEach((key) => {
    items.add(key)
  })

  // Any categories already present in the data
  availableCategories.value.forEach((key) => {
    items.add(key)
  })

  items.delete('uncategorized')

  return [
    { label: 'Uncategorized', value: '' },
    ...Array.from(items)
      .sort()
      .map(value => ({ label: value, value }))
  ]
})

type PendingCategoryChange = {
  id: string
  description: string
  from: string
  to: string
}

const transactionById = computed(() => {
  const map = new Map<string, TransactionRow>()
  allTransactions.value.forEach((tx) => {
    map.set(tx.id, tx)
  })
  return map
})

const pendingChanges = computed<PendingCategoryChange[]>(() => {
  const changes: PendingCategoryChange[] = []

  for (const [id, from] of Object.entries(originalCategoryById.value)) {
    const to = draftCategoryById.value[id] ?? ''

    if (to !== from) {
      const tx = transactionById.value.get(id)
      changes.push({
        id,
        description: tx?.description ?? id,
        from,
        to
      })
    }
  }

  return changes
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

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(filteredAndSortedData.value.length / pageSize))
})

const paginatedData = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredAndSortedData.value.slice(start, start + pageSize)
})

const pageRange = computed(() => {
  if (filteredAndSortedData.value.length === 0) {
    return { start: 0, end: 0 }
  }

  const start = (page.value - 1) * pageSize + 1
  const end = Math.min(page.value * pageSize, filteredAndSortedData.value.length)
  return { start, end }
})

const totalFilteredAmount = computed(() => {
  return filteredAndSortedData.value.reduce((sum, tx) => sum + tx.amount, 0)
})

const formattedTotalFilteredAmount = computed(() => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(totalFilteredAmount.value)
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

type UpdateCategoriesResponse = {
  success: boolean
  updatedCount: number
  updated: Array<{ id: string, category: string | null }>
}

const saveCategoryChanges = async () => {
  if (pendingChanges.value.length === 0) {
    exitEditMode()
    return
  }

  isSaving.value = true

  try {
    const response = await apiFetch<UpdateCategoriesResponse>('/api/transactions/categories', {
      method: 'PATCH',
      body: {
        updates: pendingChanges.value.map(change => ({
          id: change.id,
          category: change.to ? change.to : null
        }))
      }
    })

    if (!response.success) {
      throw new Error('Failed to update categories')
    }

    const updatedById = new Map(response.updated.map(u => [u.id, u.category]))

    allTransactions.value = allTransactions.value.map((tx) => {
      if (!updatedById.has(tx.id)) {
        return tx
      }

      const category = updatedById.get(tx.id)

      return {
        ...tx,
        category: category == null ? undefined : category
      }
    })

    exitEditMode()
  } catch (error) {
    console.error('[HomeSales] failed to update categories', error)

    toast.add({
      title: 'Failed to save categories',
      description: 'Please try again.',
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}

watch([() => props.period, () => props.range], () => {
  if (isEditingCategories.value) {
    exitEditMode()
  }
})

watch([filteredAndSortedData, () => props.period, () => props.range], () => {
  if (page.value > totalPages.value) {
    page.value = totalPages.value
  }
  if (page.value < 1) {
    page.value = 1
  }
})

watch([searchQuery, selectedCategories, sortField, sortDirection], () => {
  page.value = 1
})

const USelectMenu = resolveComponent('USelectMenu')

const coerceCategoryValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object' && 'value' in value) {
    const record = value as Record<string, unknown>
    const inner = record.value
    return inner == null ? '' : String(inner)
  }

  return ''
}

const columns: TableColumn<TransactionRow>[] = [
  {
    accessorKey: 'date',
    header: () => createSortableHeader('date', 'Date'),
    cell: ({ row }) => {
      return new Date(row.getValue('date') as string).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    }
  },
  {
    accessorKey: 'description',
    header: 'Description'
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }) => {
      const id = row.original.id

      if (!props.enableCategoryEditing || !isEditingCategories.value) {
        return row.getValue('category')
      }

      return h(USelectMenu, {
        'modelValue': draftCategoryById.value[id] ?? '',
        'onUpdate:modelValue': (value: unknown) => {
          draftCategoryById.value[id] = coerceCategoryValue(value)
        },
        'items': editCategoryItems.value,
        'searchable': true,
        'placeholder': 'Category',
        'class': 'w-full'
      }, {
        default: () => displayCategory(draftCategoryById.value[id] ?? '')
      })
    }
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
    <div class="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <UCard class="w-full sm:flex-1">
        <div class="flex flex-col sm:flex-row gap-3">
        <div v-if="enableCategoryEditing" class="flex items-center justify-end sm:order-2 sm:ml-auto">
          <UButton
            v-if="!isEditingCategories"
            color="neutral"
            variant="soft"
            icon="i-lucide-pencil"
            @click="enterEditMode"
          >
            Edit categories
          </UButton>

          <UButton
            v-else
            color="primary"
            variant="solid"
            icon="i-lucide-check"
            :disabled="isSaving"
            @click="pendingChanges.length > 0 ? (confirmOpen = true) : exitEditMode()"
          >
            Done
          </UButton>
        </div>
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

      <UCard
        class="w-full sm:w-auto sm:min-w-44"
        :ui="{ body: 'p-3 h-full' }"
      >
        <div class="flex h-full flex-col justify-center gap-1">
          <span class="text-xs uppercase tracking-wide text-muted">Total</span>
          <span class="text-sm font-semibold text-highlighted">{{ formattedTotalFilteredAmount }}</span>
        </div>
      </UCard>
    </div>

    <!-- Table -->
    <div class="overflow-x-auto -mx-4 sm:mx-0">
      <div class="inline-block min-w-full align-middle">
        <div class="overflow-hidden">
          <UTable
            :data="paginatedData"
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

    <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted">
      <div>
        Showing {{ pageRange.start }}–{{ pageRange.end }} of {{ filteredAndSortedData.length }}
      </div>
      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :disabled="page === 1"
          @click="page = Math.max(1, page - 1)"
        >
          Previous
        </UButton>
        <div class="min-w-20 text-center text-xs uppercase tracking-wide">
          Page {{ page }} / {{ totalPages }}
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          :disabled="page === totalPages"
          @click="page = Math.min(totalPages, page + 1)"
        >
          Next
        </UButton>
      </div>
    </div>
    <UModal
      v-model:open="confirmOpen"
      title="Confirm category changes"
      :description="`You are about to update ${pendingChanges.length} transaction${pendingChanges.length === 1 ? '' : 's'}.`"
      :dismissible="!isSaving"
      :close="!isSaving"
    >
      <template #body>
        <div class="flex flex-col gap-3 text-sm max-h-64 overflow-auto">
          <div
            v-for="change in pendingChanges.slice(0, 50)"
            :key="change.id"
            class="flex flex-col gap-1"
          >
            <p class="truncate">
              {{ change.description }}
            </p>
            <p class="text-xs text-muted truncate">
              {{ displayCategory(change.from) }} → {{ displayCategory(change.to) }}
            </p>
          </div>

          <p v-if="pendingChanges.length > 50" class="text-xs text-muted">
            Showing first 50 changes.
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :disabled="isSaving"
            @click="confirmOpen = false"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            variant="solid"
            :loading="isSaving"
            @click="saveCategoryChanges"
          >
            Confirm
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
