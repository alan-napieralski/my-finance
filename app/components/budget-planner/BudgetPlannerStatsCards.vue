<script setup lang="ts">
export type BudgetStatCard = {
  key: string
  label: string
  value: string
  valueClass?: string
}

defineProps<{
  stats: BudgetStatCard[]
}>()
</script>

<template>
  <div class="grid grid-cols-1 min-[360px]:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-3">
    <UCard v-for="stat in stats" :key="stat.key">
      <p class="text-xs text-muted uppercase mb-1.5">
        {{ stat.label }}
      </p>
      <p :class="['text-lg sm:text-xl xl:text-2xl font-semibold', stat.valueClass ?? 'text-highlighted']">
        {{ stat.value }}
      </p>
    </UCard>
  </div>
</template>
