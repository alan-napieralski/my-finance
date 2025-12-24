<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import PlansDebtsTab from '~/components/plans/tabs/PlansDebtsTab.vue'
import PlansSavingsTab from '~/components/plans/tabs/PlansSavingsTab.vue'
import PlansWantsTab from '~/components/plans/tabs/PlansWantsTab.vue'

const items: TabsItem[] = [{
  label: 'Savings',
  value: 'savings'
}, {
  label: 'Wants',
  value: 'wants'
}, {
  label: 'Debts',
  value: 'debts'
}, {
  label: 'Recurring',
  value: 'recurring'
}]

const current = ref<'savings' | 'wants' | 'debts' | 'recurring'>('savings')
</script>

<template>
  <UDashboardPanel id="plans">
    <template #header>
      <UDashboardNavbar title="Plans" :ui="{ toggle: 'hidden' }" />

      <UDashboardToolbar>
        <div class="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 w-full">
          <UTabs v-model="current" :items="items" class="max-w-md min-w-max" />
        </div>
      </UDashboardToolbar>
    </template>

    <template #body>
      <PlansSavingsTab v-if="current === 'savings'" />

      <PlansWantsTab v-else-if="current === 'wants'" />

      <PlansRecurringPayments v-else-if="current === 'recurring'" />

      <PlansDebtsTab v-else />
    </template>
  </UDashboardPanel>
</template>
