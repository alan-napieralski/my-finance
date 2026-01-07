// Budget domain types.
// Note: runtime Zod schemas (monthIdSchema, budgetMonthSchema) live in `app/schemas/budget.ts`.

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
