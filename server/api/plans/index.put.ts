import { z } from 'zod'
import type { PlansPayload } from '~/types'
import { withPgClient } from '../../utils/db'
import { createError } from 'h3'

const toNumber = (value: unknown): number => {
  if (value == null || value === '') return NaN
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
  return Number.isFinite(parsed) ? parsed : NaN
}

const toOptionalNumber = (value: unknown): number | null => {
  if (value == null || value === '') return null
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const savingsSchema = z.object({
  monthlyAmount: z.preprocess(toNumber, z.number().finite().nonnegative())
})

const wantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().max(200),
  monthlyAmount: z.preprocess(toNumber, z.number().finite().nonnegative()),
  targetAmount: z.preprocess(toOptionalNumber, z.number().finite().nonnegative().nullable()).optional(),
  targetDate: z.preprocess(
    value => (value == null || value === '') ? null : value,
    dateSchema.nullable()
  ).optional(),
  monthsToTarget: z.preprocess(
    value => (value == null || value === '') ? null : Number(value),
    z.number().int().positive().nullable()
  ).optional(),
  notes: z.string().trim().max(1000).nullable().optional()
})

const debtSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().max(200),
  totalDebt: z.preprocess(toNumber, z.number().finite().nonnegative()),
  deadline: z.preprocess(
    value => (value == null || value === '') ? null : value,
    dateSchema.nullable()
  ).optional(),
  monthlyPayment: z.preprocess(toOptionalNumber, z.number().finite().nonnegative().nullable()).optional(),
  interestRate: z.preprocess(toOptionalNumber, z.number().finite().nonnegative().nullable()).optional(),
  notes: z.string().trim().max(1000).nullable().optional()
})

const recurringSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().max(200),
  monthlyAmount: z.preprocess(toNumber, z.number().finite().nonnegative()),
  category: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional()
})

const payloadSchema = z.object({
  savings: savingsSchema,
  wants: z.array(wantSchema),
  debts: z.array(debtSchema),
  recurringPayments: z.array(recurringSchema)
})

const normalizeOptionalText = (value: string | null | undefined): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export default eventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = payloadSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Invalid payload'
    })
  }

  const payload = parsed.data as PlansPayload

  try {
    await withPgClient(async (client) => {
      await client.query('BEGIN')

      try {
        await client.query('DELETE FROM plans_wants')
        await client.query('DELETE FROM plans_debts')
        await client.query('DELETE FROM plans_recurring_payments')
        await client.query('DELETE FROM plans_savings')

        await client.query(
          'INSERT INTO plans_savings (monthly_amount) VALUES ($1)',
          [payload.savings.monthlyAmount]
        )

        for (const want of payload.wants) {
          await client.query(
            `
INSERT INTO plans_wants (id, name, monthly_amount, target_amount, target_date, months_to_target, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7)
`.trim(),
            [
              want.id,
              want.name,
              want.monthlyAmount,
              want.targetAmount ?? null,
              want.targetDate ?? null,
              want.monthsToTarget ?? null,
              normalizeOptionalText(want.notes)
            ]
          )
        }

        for (const debt of payload.debts) {
          await client.query(
            `
INSERT INTO plans_debts (id, name, total_debt, deadline, monthly_payment, interest_rate, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7)
`.trim(),
            [
              debt.id,
              debt.name,
              debt.totalDebt,
              debt.deadline ?? null,
              debt.monthlyPayment ?? null,
              debt.interestRate ?? null,
              normalizeOptionalText(debt.notes)
            ]
          )
        }

        for (const payment of payload.recurringPayments) {
          await client.query(
            `
INSERT INTO plans_recurring_payments (id, name, monthly_amount, category, notes)
VALUES ($1, $2, $3, $4, $5)
`.trim(),
            [
              payment.id,
              payment.name,
              payment.monthlyAmount,
              normalizeOptionalText(payment.category ?? null),
              normalizeOptionalText(payment.notes)
            ]
          )
        }

        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
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

  return { success: true }
})
