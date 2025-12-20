<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlansStore } from '~/stores/plans'
import { subcategoryToMainCategory } from '~/utils/budgetCategories'
import { formatCurrency } from '~/utils/currency'

const plansStore = usePlansStore()

const { recurringPayments, totalRecurringPaymentsPerMonth } = storeToRefs(plansStore)
const { addRecurringPayment, removeRecurringPayment } = plansStore

const categoryKeys = Object.keys(subcategoryToMainCategory)

const formatCategoryLabel = (key: string): string => {
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : key
}

const categoryItems = computed(() => {
  return categoryKeys.map(key => ({
    label: formatCategoryLabel(key),
    value: key
  }))
})

const normalizeCategory = (value: string | undefined): string => {
  const key = (value ?? '').trim().toLowerCase()
  return categoryKeys.includes(key) ? key : 'uncategorized'
}
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-6 lg:max-w-3xl">
    <UPageCard
      title="Recurring payments"
      description="Add fixed monthly expenses like rent and subscriptions."
      variant="naked"
      class="mb-2"
    >
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-4 w-full">
          <div class="text-sm text-muted">
            Total recurring per month
          </div>
          <div class="text-2xl font-semibold text-highlighted">
            {{ formatCurrency(totalRecurringPaymentsPerMonth) }}
          </div>
        </div>
      </template>
    </UPageCard>

    <UPageCard
      variant="subtle"
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }"
    >
      <template #header>
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <h2 class="text-sm font-medium text-highlighted">
            Payments
          </h2>

          <UButton
            color="neutral"
            icon="i-lucide-plus"
            label="Add payment"
            size="sm"
            class="w-fit"
            @click="addRecurringPayment"
          />
        </div>
      </template>

      <div v-if="recurringPayments.length" class="divide-y divide-default">
        <div
          v-for="payment in recurringPayments"
          :key="payment.id"
          class="flex flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4"
        >
          <div class="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">
            <UFormField
              :name="`recurring-name-${payment.id}`"
              label="Name"
              class="flex-1 w-full sm:w-auto sm:min-w-[10rem]"
            >
              <UInput
                :model-value="payment.name"
                placeholder="Rent, Netflix, etc."
                @update:model-value="value => plansStore.updateRecurringPayment(payment.id, { name: String(value) })"
              />
            </UFormField>

            <UFormField
              :name="`recurring-category-${payment.id}`"
              label="Category"
              class="w-full sm:w-48"
            >
              <USelect
                :model-value="normalizeCategory(payment.category)"
                :items="categoryItems"
                @update:model-value="value => plansStore.updateRecurringPayment(payment.id, { category: String(value) })"
              />
            </UFormField>

            <UFormField
              :name="`recurring-monthly-${payment.id}`"
              label="Monthly amount"
              class="w-full sm:w-40"
            >
              <UInput
                :model-value="payment.monthlyAmount"
                type="number"
                min="0"
                step="10"
                @update:model-value="value => plansStore.updateRecurringPayment(payment.id, { monthlyAmount: Number(value) })"
              />
            </UFormField>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              class="self-start sm:self-center"
              @click="removeRecurringPayment(payment.id)"
            />
          </div>

          <UFormField
            :name="`recurring-notes-${payment.id}`"
            label="Notes"
          >
            <UTextarea
              :model-value="payment.notes"
              :rows="2"
              autoresize
              placeholder="Optional notes."
              @update:model-value="value => plansStore.updateRecurringPayment(payment.id, { notes: String(value) })"
            />
          </UFormField>
        </div>
      </div>

      <div v-else class="px-4 py-6 sm:px-6 text-sm text-muted">
        No recurring payments yet. Use “Add payment” to add rent, subscriptions, etc.
      </div>
    </UPageCard>
  </div>
</template>
