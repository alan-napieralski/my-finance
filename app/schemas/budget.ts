import { z } from 'zod'

export const monthIdSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Invalid monthId format. Expected YYYY-MM')

type WantOverride = {
  disabled?: boolean
  amountOverride?: number
}

type DebtPaymentStatus = {
  paid?: boolean
}

type IncomeLine = {
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

// Keep runtime schema file self-contained. Types are exported from ~/types.
export type BudgetMonthSchema = z.infer<typeof budgetMonthSchema>
export type IncomeLineSchema = IncomeLine
export type WantOverrideSchema = WantOverride
export type DebtPaymentStatusSchema = DebtPaymentStatus
