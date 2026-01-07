<script setup lang="ts">
const route = useRoute()
const router = useRouter()

type SettingsSection = 'income'

const sections: Array<{ key: SettingsSection, label: string }> = [{
  key: 'income',
  label: 'Income'
}]

const getSectionFromQuery = (): SettingsSection => {
  const value = route.query.section
  if (typeof value === 'string' && sections.some(s => s.key === value)) {
    return value as SettingsSection
  }
  return 'income'
}

const current = computed<SettingsSection>({
  get: () => getSectionFromQuery(),
  set: (value) => {
    router.replace({
      query: {
        ...route.query,
        section: value
      }
    })
  }
})
</script>

<template>
  <UDashboardPanel id="settings">
    <template #header>
      <UDashboardNavbar title="Settings" :ui="{ toggle: 'hidden' }" />
    </template>

    <template #body>
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <UCard class="lg:col-span-3">
          <template #header>
            <h2 class="text-sm font-medium text-highlighted">
              Settings
            </h2>
          </template>

          <div class="flex flex-col gap-1">
            <button
              v-for="item in sections"
              :key="item.key"
              type="button"
              class="w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="current === item.key ? 'bg-elevated text-highlighted' : 'text-muted hover:text-highlighted hover:bg-elevated/50'"
              @click="current = item.key"
            >
              {{ item.label }}
            </button>
          </div>
        </UCard>

        <div class="lg:col-span-9">
          <SettingsIncomeRules v-if="current === 'income'" />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
