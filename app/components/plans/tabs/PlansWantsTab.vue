<script setup lang="ts">
import { storeToRefs } from 'pinia'
import type { WantPlan } from '~/types'
import { usePlansStore } from '~/stores/plans'
import { formatCurrency } from '~/utils/currency'

const plansStore = usePlansStore()

const { wants, totalWantsPerMonth, isSaving } = storeToRefs(plansStore)
const { addWant, removeWant, savePlans } = plansStore

const getWantCalculatedMonthlyAmount = (want: WantPlan): number => {
  const targetAmount = Number(want.targetAmount ?? 0)
  const monthsToTarget = Number(want.monthsToTarget ?? 0)

  if (!Number.isFinite(targetAmount) || targetAmount <= 0) return 0
  if (!Number.isFinite(monthsToTarget) || monthsToTarget <= 0) return 0

  return targetAmount / monthsToTarget
}
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-6 lg:max-w-3xl">
    <UPageCard
      title="Wants overview"
      description="Plan for the things you want and how much you set aside each month."
      variant="naked"
      class="mb-2"
    >
      <template #footer>
        <div class="flex flex-wrap items-center justify-between gap-4 w-full">
          <div class="text-sm text-muted">
            Total monthly for wants
          </div>
          <div class="text-2xl font-semibold text-highlighted">
            {{ formatCurrency(totalWantsPerMonth) }}
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
            Wants
          </h2>

          <UButton
            color="neutral"
            icon="i-lucide-plus"
            label="Add want"
            size="sm"
            class="w-fit"
            @click="addWant"
          />

          <UButton
            color="primary"
            icon="i-lucide-save"
            label="Save"
            size="sm"
            :loading="isSaving"
            class="w-fit"
            @click="savePlans"
          />
        </div>
      </template>

      <div v-if="wants.length" class="divide-y divide-default">
        <div
          v-for="want in wants"
          :key="want.id"
          class="flex flex-col gap-3 px-4 py-3 sm:px-6 sm:py-4"
        >
          <div class="flex items-start justify-between gap-3">
            <UFormField
              :name="`name-${want.id}`"
              label="Name"
              class="flex-1 min-w-0"
            >
              <UInput
                v-model="want.name"
                placeholder="New laptop, holiday, etc."
              />
            </UFormField>

            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              class="shrink-0 mt-6"
              @click="removeWant(want.id)"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <UFormField
              :name="`targetAmount-${want.id}`"
              label="Target amount"
            >
              <UInput
                v-model.number="want.targetAmount"
                type="number"
                min="0"
                step="50"
                placeholder="Optional"
              />
            </UFormField>

            <UFormField
              :name="`monthsToTarget-${want.id}`"
              label="Months"
            >
              <UInput
                v-model.number="want.monthsToTarget"
                type="number"
                min="1"
                step="1"
                placeholder="Optional"
              />
            </UFormField>

            <UFormField
              :name="`calculatedMonthly-${want.id}`"
              label="Monthly (calculated)"
            >
              <UInput
                :model-value="formatCurrency(getWantCalculatedMonthlyAmount(want))"
                disabled
              />
            </UFormField>
          </div>

          <UFormField
            :name="`manualMonthly-${want.id}`"
            label="Monthly override (optional)"
            description="If set, overrides the calculated monthly amount. Set to 0 to use the calculation."
          >
            <UInput
              v-model.number="want.monthlyAmount"
              type="number"
              min="0"
              step="10"
            />
          </UFormField>

          <UFormField
            :name="`notes-${want.id}`"
            label="Notes"
          >
            <UTextarea
              v-model="want.notes"
              :rows="2"
              autoresize
              placeholder="Optional details for this goal."
            />
          </UFormField>
        </div>
      </div>

      <div v-else class="px-4 py-6 sm:px-6 text-sm text-muted">
        You don't have any wants yet. Use "Add want" to start planning.
      </div>
    </UPageCard>
  </div>
</template>
