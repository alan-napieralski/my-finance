import crypto from 'node:crypto'
import { format } from 'date-fns'
import { createError } from 'h3'
import type { PoolClient } from 'pg'
import type { FinanceTransactionPayload } from '~/types'
import { parseTransactionDate } from '~/utils/dateParser'

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const normalizeDescriptionForFingerprint = (value: string) => {
  return normalizeWhitespace(value)
    .normalize('NFKC')
    .toLowerCase()
}

const toFiniteNumber = (value: unknown): number | null => {
  const raw = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(/,/g, ''))
  return Number.isFinite(raw) ? raw : null
}

const roundMoney = (value: number): number => {
  return Math.round(value * 100) / 100
}

const toMoneyString = (value: number): string => {
  return roundMoney(value).toFixed(2)
}

type NormalizedInsertRow = {
  sourceSystem: string
  sourceAccount: string | null
  postedOn: string
  amount: string
  balance: string | null
  description: string
  category: string | null
  fingerprint: string
  raw: string | null
}

const computeFingerprint = (input: {
  sourceSystem: string
  sourceAccount: string | null
  postedOn: string
  amount: string
  balance: string | null
  description: string
}) => {
  const canonical = [
    input.sourceSystem,
    input.sourceAccount ?? '',
    input.postedOn,
    input.amount,
    input.balance ?? '',
    normalizeDescriptionForFingerprint(input.description)
  ].join('|')

  return crypto.createHash('sha256').update(canonical).digest('hex')
}

const normalizeOne = (
  tx: FinanceTransactionPayload,
  index: number,
  sourceSystem: string,
  sourceAccount: string | null
): NormalizedInsertRow => {
  const date = parseTransactionDate(String(tx.date ?? ''))
  if (!date) {
    throw createError({
      statusCode: 400,
      statusMessage: `Bad Request: invalid transaction date at index ${index}`
    })
  }

  const amountNumber = toFiniteNumber(tx.amount)
  if (amountNumber == null) {
    throw createError({
      statusCode: 400,
      statusMessage: `Bad Request: invalid transaction amount at index ${index}`
    })
  }

  const description = normalizeWhitespace(String(tx.description ?? ''))
  if (!description) {
    throw createError({
      statusCode: 400,
      statusMessage: `Bad Request: missing transaction description at index ${index}`
    })
  }

  const balanceNumber = tx.balance == null ? null : toFiniteNumber(tx.balance)
  if (tx.balance != null && balanceNumber == null) {
    throw createError({
      statusCode: 400,
      statusMessage: `Bad Request: invalid transaction balance at index ${index}`
    })
  }

  const postedOn = format(date, 'yyyy-MM-dd')
  const amount = toMoneyString(amountNumber)
  const balance = balanceNumber == null ? null : toMoneyString(balanceNumber)

  const category = tx.category == null ? null : normalizeWhitespace(String(tx.category)) || null

  const fingerprint = computeFingerprint({
    sourceSystem,
    sourceAccount,
    postedOn,
    amount,
    balance,
    description
  })

  return {
    sourceSystem,
    sourceAccount,
    postedOn,
    amount,
    balance,
    description,
    category,
    fingerprint,
    raw: JSON.stringify(tx)
  }
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

const buildBulkInsert = (rows: NormalizedInsertRow[]) => {
  const columns = [
    'source_system',
    'source_account',
    'posted_on',
    'amount',
    'balance',
    'description',
    'category',
    'fingerprint',
    'raw'
  ] as const

  const values: Array<string | null> = []
  const valueGroups: string[] = []

  const castFor = (column: typeof columns[number]) => {
    if (column === 'posted_on') return '::date'
    if (column === 'amount' || column === 'balance') return '::numeric'
    if (column === 'raw') return '::jsonb'
    return ''
  }

  rows.forEach((row, rowIndex) => {
    const base = rowIndex * columns.length

    const placeholders = columns.map((col, colIndex) => {
      return `$${base + colIndex + 1}${castFor(col)}`
    })

    valueGroups.push(`(${placeholders.join(', ')})`)

    values.push(
      row.sourceSystem,
      row.sourceAccount,
      row.postedOn,
      row.amount,
      row.balance,
      row.description,
      row.category,
      row.fingerprint,
      row.raw
    )
  })

  const text = `
INSERT INTO transactions (${columns.join(', ')})
VALUES ${valueGroups.join(', ')}
ON CONFLICT (source_system, fingerprint) DO NOTHING
`.trim()

  return { text, values }
}

export type IngestResult = {
  runId: string
  receivedAt: string
  rowsSeen: number
  rowsInserted: number
  rowsSkippedDuplicates: number
}

export async function ingestFinanceTransactions(options: {
  client: PoolClient
  sourceSystem: string
  sourceAccount?: string
  transactions: FinanceTransactionPayload[]
  meta?: Record<string, unknown>
}): Promise<IngestResult> {
  const sourceAccount = options.sourceAccount?.trim() || null

  const MAX_TRANSACTIONS = 20000
  if (options.transactions.length > MAX_TRANSACTIONS) {
    throw createError({
      statusCode: 413,
      statusMessage: `Payload too large: max ${MAX_TRANSACTIONS} transactions per request`
    })
  }

  const normalized = options.transactions.map((tx, index) => {
    return normalizeOne(tx, index, options.sourceSystem, sourceAccount)
  })

  const rowsSeen = normalized.length
  const CHUNK_SIZE = 500

  let rowsInserted = 0

  await options.client.query('BEGIN')

  try {
    for (const batch of chunk(normalized, CHUNK_SIZE)) {
      const { text, values } = buildBulkInsert(batch)
      const result = await options.client.query(text, values)
      rowsInserted += result.rowCount ?? 0
    }

    const rowsSkippedDuplicates = rowsSeen - rowsInserted

    const runInsert = await options.client.query(
      `
INSERT INTO ingest_runs (source_system, source_account, rows_seen, rows_inserted, rows_skipped_duplicates, meta)
VALUES ($1, $2, $3, $4, $5, $6::jsonb)
RETURNING id, received_at
`.trim(),
      [
        options.sourceSystem,
        sourceAccount,
        rowsSeen,
        rowsInserted,
        rowsSkippedDuplicates,
        options.meta ? JSON.stringify(options.meta) : null
      ]
    )

    await options.client.query('COMMIT')

    const row = runInsert.rows[0] as { id: string, received_at: string | Date }
    const receivedAt = typeof row.received_at === 'string' ? row.received_at : row.received_at.toISOString()

    return {
      runId: row.id,
      receivedAt,
      rowsSeen,
      rowsInserted,
      rowsSkippedDuplicates
    }
  } catch (error) {
    await options.client.query('ROLLBACK')
    throw error
  }
}
