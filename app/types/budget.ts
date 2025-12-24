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
  monthId: string // YYYY-MM
  income: IncomeLine[]
  plannedSavingsOverride?: number

  /**
   * Per-month controls for wants (disable and/or amount override).
   */
  wantOverrides?: Record<string, WantOverride>

  /**
   * Per-month status for debts (e.g., whether you've paid it this month).
   */
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
