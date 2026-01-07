import type { FinanceEntry, Transaction, TransactionRow } from '~/types'
import { parseTransactionDate } from '~/utils/dateParser'

type AnyRecord = Record<string, unknown>

export type ParsedFinanceTransaction = {
  id: string
  date: Date
  amount: number
  balance?: number
  category?: string
  description?: string
}

/**
 * Attempts to coerce a value into a finite number.
 *
 * Returns `null` when the value cannot be safely parsed as a finite number.
 * Callers are expected to handle this case (e.g. by throwing a descriptive
 * error or falling back), which helps avoid silent parsing issues.
 */
const toNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'string'
    ? Number.parseFloat(value)
    : typeof value === 'number'
      ? value
      : Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const normalizeTransactionsPayload = (entry: FinanceEntry | null): unknown[] => {
  if (!entry || !entry.data) {
    return []
  }

  const payload = entry.data as unknown

  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && typeof payload === 'object' && 'transactions' in payload) {
    const record = payload as AnyRecord
    const transactions = record.transactions
    return Array.isArray(transactions) ? transactions : []
  }

  return []
}

export function parseFinanceTransactions(entry: FinanceEntry | null): ParsedFinanceTransaction[] {
  const source = normalizeTransactionsPayload(entry)

  const describeValue = (value: unknown): string => {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  return source.map((item, index) => {
    const record = item as AnyRecord

    const rawDate = record.date
    const rawAmount = record.amount

    const date = parseTransactionDate(String(rawDate ?? ''))
    const amount = toNumber(rawAmount)

    if (!date || amount == null) {
      throw new Error(`[finance/transactions] Invalid transaction at index ${index}: date=${describeValue(rawDate)} amount=${describeValue(rawAmount)}`)
    }

    const balance = record.balance == null ? undefined : toNumber(record.balance) ?? undefined

    const parsed: ParsedFinanceTransaction = {
      id: String(record.id ?? index),
      date,
      amount
    }

    if (record.category != null) {
      parsed.category = String(record.category)
    }

    if (record.description != null) {
      parsed.description = String(record.description)
    }

    if (balance != null) {
      parsed.balance = balance
    }

    return parsed
  })
}

export function toBudgetTransactions(entry: FinanceEntry | null): Transaction[] {
  return parseFinanceTransactions(entry).map(tx => ({
    date: tx.date,
    amount: tx.amount,
    category: tx.category ?? 'Uncategorized',
    description: tx.description ?? ''
  }))
}

export function toBudgetTransactionsFromRows(rows: TransactionRow[]): Transaction[] {
  return rows.map(row => ({
    date: new Date(row.date),
    amount: row.amount,
    category: row.category ?? 'Uncategorized',
    description: row.description ?? ''
  }))
}

export function toTransactionRows(entry: FinanceEntry | null): TransactionRow[] {
  return parseFinanceTransactions(entry).map(tx => ({
    id: tx.id,
    date: tx.date.toISOString(),
    description: tx.description ?? '',
    amount: tx.amount,
    balance: tx.balance,
    category: tx.category
  }))
}
