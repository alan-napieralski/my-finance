import { createError } from 'h3'
import { z } from 'zod'
import type { FinanceIngestRequest, FinanceTransactionPayload } from '~/types'

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

const omitKeys = (record: Record<string, unknown>, keys: string[]) => {
  const omit = new Set(keys)
  return Object.fromEntries(Object.entries(record).filter(([k]) => !omit.has(k)))
}

export function parseFinanceIngestBody(body: unknown): FinanceIngestRequest {
  if (!body || (typeof body !== 'object' && !Array.isArray(body))) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request: Invalid JSON payload' })
  }

  let record: Record<string, unknown> = {}
  let transactions: unknown

  if (Array.isArray(body)) {
    transactions = body
  } else {
    record = body as Record<string, unknown>

    // Prefer explicit transactions array.
    if (Array.isArray(record.transactions)) {
      transactions = record.transactions
    }

    // Common n8n shape: { body: [ ... ] }
    if (transactions == null && Array.isArray(record.body) && !('transactions' in record)) {
      transactions = record.body
    }
  }

  const sourceSystemRaw = String(record.source_system ?? record.sourceSystem ?? '').trim()
  const sourceSystem = sourceSystemRaw || 'default'

  const sourceAccountRaw = record.source_account ?? record.sourceAccount
  const sourceAccount = sourceAccountRaw == null ? undefined : String(sourceAccountRaw).trim() || undefined

  if (!Array.isArray(transactions)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: transactions array is required'
    })
  }

  // Lightweight validation of transaction item shapes (full normalization happens later)
  const txSchema: z.ZodType<FinanceTransactionPayload> = z.object({
    id: z.string().optional(),
    date: z.preprocess(val => typeof val === 'number' ? String(val) : val, z.string()),
    amount: z.union([z.string(), z.number()]),
    balance: z.union([z.string(), z.number()]).optional(),
    category: z.string().optional(),
    description: z.string().optional()
  }).passthrough()

  let parsedTransactions: FinanceTransactionPayload[]

  try {
    parsedTransactions = z.array(txSchema).parse(transactions)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issue = error.issues[0]
      const message = issue?.message ?? error.message
      throw createError({
        statusCode: 400,
        statusMessage: `Bad Request: invalid transaction payload. ${message}`
      })
    }

    throw error
  }

  const meta = isRecord(body)
    ? omitKeys(record, ['transactions', 'body', 'source_system', 'sourceSystem', 'source_account', 'sourceAccount'])
    : undefined

  return {
    sourceSystem,
    sourceAccount,
    transactions: parsedTransactions,
    meta
  }
}
