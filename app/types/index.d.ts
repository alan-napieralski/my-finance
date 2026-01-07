import type { AvatarProps } from '@nuxt/ui'

export * from './analytics'
export * from './budget'
export * from './finance'
export * from './plans'

export type FetchResult<T> = { data: T, error: null } | { data: null, error: unknown }

export interface UpdatedCategory {
  id: string
  category: string | null
}

export interface UpdateBatchResult {
  updated: UpdatedCategory[]
}

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'

export interface User {
  id: number
  name: string
  email: string
  avatar?: AvatarProps
  status: UserStatus
  location: string
}

export interface Mail {
  id: number
  unread?: boolean
  from: User
  subject: string
  body: string
  date: string
}

export interface Member {
  name: string
  username: string
  role: 'member' | 'owner'
  avatar: AvatarProps
}

export interface Sale {
  id: string
  date: string
  status: SaleStatus
  email: string
  amount: number
}
