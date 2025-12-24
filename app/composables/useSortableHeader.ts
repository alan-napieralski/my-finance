import { h } from 'vue'
import { UIcon } from '#components'
import type { SortField, SortDirection } from '~/types'

export function useSortableHeader(
  sortField: Ref<SortField>,
  sortDirection: Ref<SortDirection>,
  toggleSort: (field: SortField) => void
) {
  return (field: SortField, label: string, alignRight = false) => {
    const iconName = sortField.value === field
      ? (sortDirection.value === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down')
      : 'i-lucide-arrow-up-down'

    return h('button', {
      class: `flex items-center gap-1.5 hover:bg-primary/10 hover:text-primary transition-all cursor-pointer ${alignRight ? 'ml-auto' : ''} px-2 py-1 -mx-2 -my-1 rounded`,
      onClick: () => toggleSort(field)
    }, [
      label,
      h(UIcon, {
        name: iconName,
        class: `size-4 ${sortField.value === field ? 'text-primary' : ''}`
      })
    ])
  }
}
