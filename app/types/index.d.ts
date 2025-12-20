import type { AvatarProps } from '@nuxt/ui'

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

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

export interface Sale {
  id: string
  date: string
  status: SaleStatus
  email: string
  amount: number
}

export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}

export interface GeneralSavings {
  monthlyAmount: number
}

export interface WantPlan {
  id: string
  name: string
  monthlyAmount: number
  targetAmount?: number
  targetDate?: string
  notes?: string
}

export interface DebtPlan {
  id: string
  name: string
  totalDebt: number
  deadline: string
  monthlyPayment: number
  interestRate?: number
  notes?: string
}

export interface RecurringPayment {
  id: string
  name: string
  monthlyAmount: number
  category?: string
  notes?: string
}

export interface IncomeLine {
  id: string
  name: string
  amount: number
}

export interface BudgetMonth {
  monthId: string // YYYY-MM
  income: IncomeLine[]
  plannedSavingsOverride?: number
}

// Finance API types
export interface FinanceTransactionPayload {
  id?: string
  date: string
  amount: string | number
  balance?: string | number
  category?: string
  description?: string
}

export interface FinanceEntry {
  id: string
  timestamp: string
  data: Record<string, unknown> | { transactions?: FinanceTransactionPayload[] } | FinanceTransactionPayload[]
}

export interface TransactionRow {
  id: string
  date: string
  description: string
  category?: string
  amount: number
  balance?: number
}

export interface Transaction {
  date: Date
  amount: number
  category: string
  description: string
}

export type SortField = 'date' | 'amount' | 'balance'
export type SortDirection = 'asc' | 'desc'
