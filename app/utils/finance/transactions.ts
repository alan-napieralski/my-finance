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

  return source
    .map((item, index) => {
      const record = item as AnyRecord

      const date = parseTransactionDate(String(record.date ?? ''))
      const amount = toNumber(record.amount)

      if (!date || amount == null) {
        return null
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
    .filter((item): item is ParsedFinanceTransaction => item !== null)
}

export function toBudgetTransactions(entry: FinanceEntry | null): Transaction[] {
  return parseFinanceTransactions(entry).map(tx => ({
    date: tx.date,
    amount: tx.amount,
    category: tx.category ?? 'Uncategorized',
    description: tx.description ?? ''
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
