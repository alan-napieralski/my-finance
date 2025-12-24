<script setup lang="ts">
import type { MainCategorySummary, SubcategorySummary } from '~/types'
import { formatCurrency } from '~/utils/currency'

defineProps<{
  fetchError: unknown
  previousMonthLabel: string
  mainCategoryBreakdown: MainCategorySummary[]
  subcategoryBreakdown: SubcategorySummary[]
}>()
</script>

<template>
  <div v-if="fetchError" class="text-sm text-error">
    Failed to load transaction data. Please try refreshing the page.
  </div>

  <!-- Spending breakdown - stack on mobile, 2 cols on xl+ -->
  <div v-else-if="subcategoryBreakdown.length" class="grid grid-cols-1 xl:grid-cols-2 gap-4">
    <!-- Main Categories Table -->
    <UCard>
      <template #header>
        <h3 class="text-sm font-medium text-highlighted">
          Spending by category
        </h3>
      </template>

      <div class="sm:hidden divide-y divide-default/50">
        <div
          v-for="row in mainCategoryBreakdown"
          :key="row.mainCategory"
          class="py-2.5 flex items-start justify-between gap-3"
        >
          <div class="min-w-0">
            <div class="text-sm text-highlighted font-medium capitalize truncate">
              {{ row.mainCategory }}
            </div>
            <div class="text-xs text-muted">
              {{ previousMonthLabel }}: {{ formatCurrency(row.previousMonth) }}
            </div>
          </div>

          <div class="text-right shrink-0">
            <div class="text-sm text-highlighted font-medium whitespace-nowrap">
              {{ formatCurrency(row.actual) }}
            </div>
            <div class="text-xs whitespace-nowrap">
              <span
                class="inline-flex items-center gap-1 font-medium"
                :class="{
                  'text-success': row.momChange < 0,
                  'text-error': row.momChange > 0,
                  'text-muted': row.momChange === 0
                }"
              >
                <UIcon
                  v-if="row.momChange !== 0"
                  :name="row.momChange > 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                  class="size-3.5"
                />
                <template v-if="row.momChangePercent !== null">
                  {{ row.momChange > 0 ? '+' : '' }}{{ row.momChangePercent }}%
                </template>
                <template v-else-if="row.actual > 0 && row.previousMonth === 0">New</template>
                <template v-else>—</template>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="hidden sm:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-default text-xs text-muted uppercase">
              <th class="py-2 text-left font-medium">
                Category
              </th>
              <th class="py-2 text-right font-medium">
                Spent
              </th>
              <th class="py-2 text-right font-medium">
                {{ previousMonthLabel }}
              </th>
              <th class="py-2 text-right font-medium">
                MoM
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in mainCategoryBreakdown"
              :key="row.mainCategory"
              class="border-b border-default/50"
            >
              <td class="py-2.5 text-highlighted font-medium capitalize">
                {{ row.mainCategory }}
              </td>
              <td class="py-2.5 text-right text-highlighted font-medium whitespace-nowrap">
                {{ formatCurrency(row.actual) }}
              </td>
              <td class="py-2.5 text-right text-dimmed whitespace-nowrap">
                {{ formatCurrency(row.previousMonth) }}
              </td>
              <td class="py-2.5 text-right whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1 font-medium"
                  :class="{
                    'text-success': row.momChange < 0,
                    'text-error': row.momChange > 0,
                    'text-muted': row.momChange === 0
                  }"
                >
                  <UIcon
                    v-if="row.momChange !== 0"
                    :name="row.momChange > 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                    class="size-3.5"
                  />
                  <template v-if="row.momChangePercent !== null">
                    {{ row.momChange > 0 ? '+' : '' }}{{ row.momChangePercent }}%
                  </template>
                  <template v-else-if="row.actual > 0 && row.previousMonth === 0">New</template>
                  <template v-else>—</template>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Subcategories Table -->
    <UCard>
      <template #header>
        <h3 class="text-sm font-medium text-highlighted">
          Detailed breakdown
        </h3>
      </template>

      <div class="sm:hidden divide-y divide-default/50">
        <div
          v-for="row in subcategoryBreakdown"
          :key="row.subcategory"
          class="py-2.5 flex items-start justify-between gap-3"
        >
          <div class="min-w-0">
            <div class="text-sm text-highlighted capitalize truncate">
              {{ row.subcategory }}
            </div>

            <div class="mt-1 flex items-center gap-2 flex-wrap">
              <UBadge
                :color="row.mainCategory === 'needs' ? 'info' : row.mainCategory === 'wants' ? 'warning' : 'success'"
                variant="subtle"
                size="sm"
              >
                {{ row.mainCategory }}
              </UBadge>
              <span class="text-xs text-muted">
                {{ previousMonthLabel }}: {{ formatCurrency(row.previousMonth) }}
              </span>
            </div>
          </div>

          <div class="text-right shrink-0">
            <div class="text-sm text-highlighted font-medium whitespace-nowrap">
              {{ formatCurrency(row.actual) }}
            </div>
            <div class="text-xs whitespace-nowrap">
              <span
                class="inline-flex items-center gap-1 font-medium"
                :class="{
                  'text-success': row.momChange < 0,
                  'text-error': row.momChange > 0,
                  'text-muted': row.momChange === 0
                }"
              >
                <UIcon
                  v-if="row.momChange !== 0"
                  :name="row.momChange > 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                  class="size-3.5"
                />
                <template v-if="row.momChangePercent !== null">
                  {{ row.momChange > 0 ? '+' : '' }}{{ row.momChangePercent }}%
                </template>
                <template v-else-if="row.actual > 0 && row.previousMonth === 0">New</template>
                <template v-else>—</template>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="hidden sm:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-default text-xs text-muted uppercase">
              <th class="py-2 text-left font-medium">
                Subcategory
              </th>
              <th class="py-2 text-right font-medium">
                Type
              </th>
              <th class="py-2 text-right font-medium">
                Spent
              </th>
              <th class="py-2 text-right font-medium">
                MoM
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in subcategoryBreakdown"
              :key="row.subcategory"
              class="border-b border-default/50"
            >
              <td class="py-2 text-muted capitalize">
                {{ row.subcategory }}
              </td>
              <td class="py-2 text-right">
                <UBadge
                  :color="row.mainCategory === 'needs' ? 'info' : row.mainCategory === 'wants' ? 'warning' : 'success'"
                  variant="subtle"
                  size="sm"
                >
                  {{ row.mainCategory }}
                </UBadge>
              </td>
              <td class="py-2 text-right text-highlighted font-medium whitespace-nowrap">
                {{ formatCurrency(row.actual) }}
              </td>
              <td class="py-2 text-right whitespace-nowrap">
                <span
                  class="inline-flex items-center gap-1 font-medium"
                  :class="{
                    'text-success': row.momChange < 0,
                    'text-error': row.momChange > 0,
                    'text-muted': row.momChange === 0
                  }"
                >
                  <UIcon
                    v-if="row.momChange !== 0"
                    :name="row.momChange > 0 ? 'i-lucide-trending-up' : 'i-lucide-trending-down'"
                    class="size-3.5"
                  />
                  <template v-if="row.momChangePercent !== null">
                    {{ row.momChange > 0 ? '+' : '' }}{{ row.momChangePercent }}%
                  </template>
                  <template v-else-if="row.actual > 0 && row.previousMonth === 0">New</template>
                  <template v-else>—</template>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>

  <div v-else class="text-sm text-muted">
    Import transactions to see spending breakdown.
  </div>
</template>
