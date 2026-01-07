<script setup lang="ts">
const route = useRoute()

const links = [{
  label: 'Home',
  icon: 'i-lucide-house',
  to: '/'
}, {
  label: 'Analytics',
  icon: 'i-lucide-line-chart',
  to: '/analytics'
}, {
  label: 'Plans',
  icon: 'i-lucide-target',
  to: '/plans'
}, {
  label: 'Settings',
  icon: 'i-lucide-settings',
  to: '/settings'
}]

const isActive = (to: string) => {
  if (to === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(to)
}
</script>

<template>
  <nav class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
    <div class="flex items-center gap-1 bg-elevated/80 backdrop-blur-xl px-2 py-2 rounded-full shadow-lg ring-1 ring-default">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="group relative flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200"
        :class="[
          isActive(link.to)
            ? 'bg-primary text-primary-foreground'
            : 'text-muted hover:text-highlighted hover:bg-elevated'
        ]"
      >
        <UIcon :name="link.icon" class="size-5 shrink-0" />
        <span
          class="text-sm font-medium overflow-hidden transition-all duration-200"
          :class="[
            isActive(link.to) ? 'max-w-24 opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-24 group-hover:opacity-100'
          ]"
        >
          {{ link.label }}
        </span>
      </NuxtLink>
    </div>
  </nav>
</template>
