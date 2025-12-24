<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { usePlansStore } from '~/stores/plans'
import { formatCurrency } from '~/utils/currency'

const plansStore = usePlansStore()
const { savings, totalSavingsPerMonth } = storeToRefs(plansStore)
const { setGeneralSavings } = plansStore
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-6 lg:max-w-2xl">
    <UPageCard
      title="General savings"
      description="Set how much you want to save per month overall."
      variant="naked"
      class="mb-2"
    />

    <UPageCard variant="subtle">
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p class="text-xs text-muted uppercase mb-1.5">
              Monthly savings
            </p>
            <p class="text-2xl font-semibold text-highlighted">
              {{ formatCurrency(totalSavingsPerMonth) }}
            </p>
          </div>
        </div>

        <UFormField
          name="monthlyAmount"
          label="Monthly savings amount"
          description="This is your total monthly savings across everything."
          class="flex max-sm:flex-col justify-between items-start gap-4"
        >
          <UInput
            :model-value="savings.monthlyAmount"
            type="number"
            min="0"
            step="10"
            class="w-full max-w-xs"
            @update:model-value="value => setGeneralSavings(Number(value))"
          />
        </UFormField>
      </div>
    </UPageCard>
  </div>
</template>
