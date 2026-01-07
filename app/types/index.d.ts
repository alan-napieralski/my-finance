import type { AvatarProps } from '@nuxt/ui'

// --- Analytics ---
export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

// --- Budget ---
export type WantOverride = {
  disabled?: boolean
  /**
   * Optional per-month override; when absent, the default want monthly is used.
   */
  amountOverride?: number
}

export type WantOverridePatch = {
  disabled?: boolean
  amountOverride?: number | null
}

export type DebtPaymentStatus = {
  paid?: boolean
}

export interface IncomeLine {
  id: string
  name: string
  amount: number
}

export interface BudgetMonth {
  monthId: string
  income: IncomeLine[]
  plannedSavingsOverride?: number
  wantOverrides?: Record<string, WantOverride>
  debtPayments?: Record<string, DebtPaymentStatus>
}

export type MainCategory = 'wants' | 'needs' | 'savings'

export type SubcategorySummary = {
  subcategory: string
  mainCategory: MainCategory
  actual: number
  previousMonth: number
  momChange: number
  momChangePercent: number | null
}

export type MainCategorySummary = {
  mainCategory: MainCategory
  actual: number
  previousMonth: number
  momChange: number
  momChangePercent: number | null
}

// UI model used by the budget planner stats cards.
export interface BudgetStatCard {
  key: string
  label: string
  value: string
  valueClass?: string
}

// --- Finance ---
export interface FinanceTransactionPayload {
  id?: string
  date: string
  amount: string | number
  balance?: string | number
  category?: string
  description?: string
}

export type FinanceIngestRequest = {
  sourceSystem: string
  sourceAccount?: string
  transactions: FinanceTransactionPayload[]
  meta?: Record<string, unknown>
}

export type FetchTransactionsOptions = {
  limit?: number
  sourceSystem?: string
  sourceAccount?: string
}

export interface FinanceEntry {
  id: string
  timestamp: string
  data: { transactions?: FinanceTransactionPayload[] } | FinanceTransactionPayload[]
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

export type TransactionsResponse = {
  count: number
  data: TransactionRow[]
}

export type SortField = 'date' | 'amount' | 'balance'
export type SortDirection = 'asc' | 'desc'

// --- Plans ---
export interface GeneralSavings {
  monthlyAmount: number
}

export interface WantPlan {
  id: string
  name: string

  /**
   * Manual fallback amount (used if target/months are not filled in).
   */
  monthlyAmount: number

  targetAmount?: number
  /**
   * Legacy field; kept for backwards compatibility/migration.
   */
  targetDate?: string

  monthsToTarget?: number

  notes?: string
}

export interface DebtPlan {
  id: string
  name: string
  totalDebt: number
  deadline: string

  /**
   * Legacy/manual value (kept for backwards compatibility).
   * The UI now calculates the monthly payment based on total debt and deadline.
   */
  monthlyPayment?: number

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

// --- Shared ---
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
