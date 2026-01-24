type ApiBase = string | undefined

type ApiFetchOptions = Parameters<typeof $fetch>[1]

const normalizeBaseUrl = (value: string): string => {
  return value.replace(/\/+$/, '')
}

export function getApiBaseUrl(): ApiBase {
  const config = useRuntimeConfig() as { public?: { apiBase?: string } }
  const raw = config.public?.apiBase?.trim() ?? ''

  if (!raw) {
    return undefined
  }

  return normalizeBaseUrl(raw)
}

export function isRemoteApiEnabled(): boolean {
  return Boolean(getApiBaseUrl())
}

export async function apiFetch<T>(request: string, options: ApiFetchOptions = {}): Promise<T> {
  const baseURL = getApiBaseUrl()

  return await $fetch<T>(request, {
    ...(baseURL ? { baseURL } : {}),
    credentials: 'include',
    ...options
  }) as T
}
