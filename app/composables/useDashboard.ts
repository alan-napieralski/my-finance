import { createSharedComposable } from '@vueuse/core'

const _useDashboard = () => {
  const router = useRouter()

  defineShortcuts({
    'g-h': () => router.push('/'),
    'g-a': () => router.push('/analytics'),
    'g-p': () => router.push('/plans')
  })

  return {}
}

export const useDashboard = createSharedComposable(_useDashboard)
