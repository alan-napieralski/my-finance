<script setup lang="ts">
import { z } from 'zod'
import { useBudgetStore } from '~/stores/budget'

const props = defineProps<{
  monthId: string
}>()

const monthIdSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/)

watchEffect(() => {
  const result = monthIdSchema.safeParse(props.monthId)
  if (!result.success) {
    console.error('[BudgetPlannerIncomeCard] Invalid monthId:', {
      monthId: props.monthId,
      issues: result.error.issues,
      formatted: result.error.format()
    })
  }
})

const budgetStore = useBudgetStore()

const month = computed(() => budgetStore.getOrCreateMonth(props.monthId))
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <h3 class="text-sm font-medium text-highlighted">
          Income
        </h3>
        <UButton
          color="neutral"
          icon="i-lucide-plus"
          size="sm"
          class="w-fit"
          @click="budgetStore.addIncomeLine(monthId)"
        >
          <span class="hidden sm:inline">Add income</span>
        </UButton>
      </div>
    </template>

    <div class="flex flex-col gap-3">
      <!-- Fixed Salary row -->
      <div class="flex flex-col gap-3">
        <UFormField name="income-salary-name" label="Name" class="w-full">
          <UInput model-value="Salary" disabled />
        </UFormField>

        <UFormField name="income-salary-amount" label="Amount" class="w-full">
          <UInput
            :model-value="month.income[0]?.amount ?? 0"
            type="number"
            step="10"
            :disabled="!month.income[0]"
            @update:model-value="(value) => {
              const incomeLine = month.income[0]
              if (incomeLine) {
                budgetStore.updateIncomeLine(monthId, incomeLine.id, { amount: value })
              }
            }"
          />
        </UFormField>
      </div>

      <!-- Additional income lines -->
      <div
        v-for="line in month.income.slice(1)"
        :key="line.id"
        class="flex flex-col gap-3 pt-3 border-t border-default/50"
      >
        <UFormField :name="`income-name-${line.id}`" label="Name" class="w-full">
          <UInput
            :model-value="line.name"
            placeholder="Bonus, side income, etc."
            @update:model-value="budgetStore.updateIncomeLine(monthId, line.id, { name: $event })"
          />
        </UFormField>

        <div class="flex items-end gap-3 min-w-0">
          <UFormField :name="`income-amount-${line.id}`" label="Amount" class="flex-1 min-w-0">
            <UInput
              :model-value="line.amount"
              type="number"
              step="10"
              @update:model-value="budgetStore.updateIncomeLine(monthId, line.id, { amount: $event })"
            />
          </UFormField>

          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            class="shrink-0"
            @click="budgetStore.removeIncomeLine(monthId, line.id)"
          />
        </div>
      </div>
    </div>
  </UCard>
</template>
