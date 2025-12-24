import { z } from 'zod'

export const monthIdSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid monthId format. Expected YYYY-MM')

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

const incomeLineSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number()
})

const wantOverrideSchema = z.object({
  disabled: z.boolean().optional(),
  amountOverride: z.number().nonnegative().optional()
})

const debtPaymentStatusSchema = z.object({
  paid: z.boolean().optional()
})

export const budgetMonthSchema = z.object({
  monthId: monthIdSchema,
  income: z.array(incomeLineSchema),
  plannedSavingsOverride: z.number().optional(),
  wantOverrides: z.record(z.string(), wantOverrideSchema).optional(),
  debtPayments: z.record(z.string(), debtPaymentStatusSchema).optional()
})

export type BudgetMonth = z.infer<typeof budgetMonthSchema>

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
