import type { DebtPlan, GeneralSavings, PlansPayload, RecurringPayment, WantPlan } from '~/types'
import { withPgClient } from '../../utils/db'
import { createError } from 'h3'

const toNumber = (value: unknown, fallback = 0): number => {
  if (value == null) return fallback
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : fallback
}

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value == null) return undefined
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : undefined
}

const toOptionalText = (value: unknown): string | undefined => {
  if (value == null) return undefined
  const text = String(value).trim()
  return text ? text : undefined
}

export default eventHandler(async () => {
  try {
    return await withPgClient(async (client) => {
      const savingsResult = await client.query(
        'SELECT monthly_amount FROM plans_savings ORDER BY created_at DESC LIMIT 1'
      )
      const savingsRow = savingsResult.rows[0] as { monthly_amount?: unknown } | undefined
      const savings: GeneralSavings = {
        monthlyAmount: toNumber(savingsRow?.monthly_amount, 0)
      }

      const wantsResult = await client.query(
        `
SELECT id, name, monthly_amount, target_amount, target_date::text AS target_date, months_to_target, notes
FROM plans_wants
ORDER BY created_at ASC, id ASC
`.trim()
      )
      const wants = (wantsResult.rows as Array<Record<string, unknown>>).map((row): WantPlan => {
        return {
          id: String(row.id),
          name: String(row.name ?? ''),
          monthlyAmount: toNumber(row.monthly_amount, 0),
          targetAmount: toOptionalNumber(row.target_amount),
          targetDate: toOptionalText(row.target_date),
          monthsToTarget: row.months_to_target == null ? undefined : Number(row.months_to_target),
          notes: toOptionalText(row.notes)
        }
      })

      const debtsResult = await client.query(
        `
SELECT id, name, total_debt, deadline::text AS deadline, monthly_payment, interest_rate, notes
FROM plans_debts
ORDER BY created_at ASC, id ASC
`.trim()
      )
      const debts = (debtsResult.rows as Array<Record<string, unknown>>).map((row): DebtPlan => {
        return {
          id: String(row.id),
          name: String(row.name ?? ''),
          totalDebt: toNumber(row.total_debt, 0),
          deadline: String(row.deadline ?? ''),
          monthlyPayment: toOptionalNumber(row.monthly_payment),
          interestRate: toOptionalNumber(row.interest_rate),
          notes: toOptionalText(row.notes)
        }
      })

      const recurringResult = await client.query(
        `
SELECT id, name, monthly_amount, category, notes
FROM plans_recurring_payments
ORDER BY created_at ASC, id ASC
`.trim()
      )
      const recurringPayments = (recurringResult.rows as Array<Record<string, unknown>>).map((row): RecurringPayment => {
        return {
          id: String(row.id),
          name: String(row.name ?? ''),
          monthlyAmount: toNumber(row.monthly_amount, 0),
          category: toOptionalText(row.category),
          notes: toOptionalText(row.notes)
        }
      })

      const payload: PlansPayload = {
        savings,
        wants,
        debts,
        recurringPayments
      }

      return payload
    })
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined
    if (code === '42P01') {
      throw createError({
        statusCode: 500,
        statusMessage: 'Plans tables are missing. Apply server/db/migrations/003_plans.sql to your database.'
      })
    }

    throw error
  }
})
