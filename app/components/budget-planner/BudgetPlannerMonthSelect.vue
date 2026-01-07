<script setup lang="ts">
import type { TabsItem } from '#ui/types'

const model = defineModel<string>({ required: true })

defineProps<{
  items: TabsItem[]
}>()
</script>

<template>
  <div>
    <div class="xl:hidden">
      <USelect v-model="model" :items="items" class="w-full" />
    </div>
    <div class="hidden xl:block overflow-x-auto">
      <UTabs v-model="model" :items="items" class="w-full min-w-max" />
    </div>
  </div>
</template>
