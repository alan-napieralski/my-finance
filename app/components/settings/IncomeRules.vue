<script setup lang="ts">
import { computed } from 'vue'

type IncomeRulesResponse = {
  descriptions: string[]
}

const toast = useToast()
const remote = isRemoteApiEnabled()

const { data, pending, error, refresh } = await useAsyncData<IncomeRulesResponse>('income-rules', async () => {
  return await apiFetch<IncomeRulesResponse>('/api/settings/income-rules')
}, {
  default: () => ({ descriptions: [] }),
  server: !remote
})

const descriptions = ref<string[]>([])

watch(data, (value) => {
  descriptions.value = [...(value?.descriptions ?? [])]
}, { immediate: true })

const newDescription = ref('')

const normalizedNew = computed(() => newDescription.value.trim())

const addDescription = () => {
  const value = normalizedNew.value
  if (!value) return

  if (descriptions.value.some(d => d.toLowerCase() === value.toLowerCase())) {
    toast.add({
      title: 'Already added',
      description: 'That income description is already in your list.',
      color: 'warning'
    })
    return
  }

  descriptions.value = [...descriptions.value, value]
  newDescription.value = ''
}

const removeDescription = (value: string) => {
  descriptions.value = descriptions.value.filter(d => d !== value)
}

const isSaving = ref(false)

const save = async () => {
  isSaving.value = true

  try {
    await apiFetch('/api/settings/income-rules', {
      method: 'PUT',
      body: {
        descriptions: descriptions.value
      }
    })

    await refresh()
    await refreshNuxtData('finance-transactions')
    await refreshNuxtData('budget-transactions')

    toast.add({
      title: 'Income rules saved',
      description: 'Income transactions will be re-categorized automatically.',
      color: 'success'
    })
  } catch (err) {
    console.error('[SettingsIncomeRules] failed to save income rules', err)

    toast.add({
      title: 'Failed to save income rules',
      description: 'Please try again.',
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UPageCard
    title="Income recognition"
    description="Add one or more transaction descriptions that should always be treated as income (e.g. Salary)."
    variant="subtle"
  >
    <div v-if="error" class="text-sm text-error">
      Failed to load income settings.
    </div>

    <div v-else class="flex flex-col gap-4">
      <div class="flex flex-col sm:flex-row gap-2">
        <UInput
          v-model="newDescription"
          placeholder="e.g. Salary"
          class="flex-1"
          :disabled="pending || isSaving"
          @keydown.enter.prevent="addDescription()"
        />
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          :disabled="!normalizedNew || pending || isSaving"
          @click="addDescription()"
        >
          Add
        </UButton>
      </div>

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <h3 class="text-sm font-medium text-highlighted">
              Income descriptions
            </h3>
            <UBadge color="neutral" variant="subtle">
              {{ descriptions.length }}
            </UBadge>
          </div>
        </template>

        <div v-if="descriptions.length === 0" class="text-sm text-muted">
          No income descriptions configured yet.
        </div>

        <div v-else class="flex flex-col gap-2">
          <div
            v-for="value in descriptions"
            :key="value"
            class="flex items-center justify-between gap-3"
          >
            <span class="text-sm truncate">{{ value }}</span>
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-trash-2"
              :disabled="pending || isSaving"
              @click="removeDescription(value)"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-2">
            <UButton
              color="primary"
              variant="solid"
              :loading="isSaving"
              :disabled="pending"
              @click="save()"
            >
              Save
            </UButton>
          </div>
        </template>
      </UCard>
    </div>
  </UPageCard>
</template>
