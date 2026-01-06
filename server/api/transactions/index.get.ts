import type { TransactionRow } from '~/types'
import type { DbTransactionRow } from '../../types/transactions'
import { withPgClient } from '../../utils/db'

const firstQueryValue = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : undefined
  }

  return typeof value === 'string' ? value : undefined
}

const isIsoDate = (value: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export default eventHandler(async (event) => {
  const query = getQuery(event)

  const start = firstQueryValue(query.start)
  const end = firstQueryValue(query.end)

  if (!start || !end || !isIsoDate(start) || !isIsoDate(end)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: start and end are required (YYYY-MM-DD)'
    })
  }

  const rawLimit = firstQueryValue(query.limit)
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : NaN
  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 20000)
    : 5000

  const sourceSystem = firstQueryValue(query.source_system) ?? firstQueryValue(query.sourceSystem)
  const sourceAccount = firstQueryValue(query.source_account) ?? firstQueryValue(query.sourceAccount)

  const data = await withPgClient(async (client) => {
    const values: unknown[] = [start, end]
    const where: string[] = ['posted_on >= $1::date', 'posted_on <= $2::date']

    if (sourceSystem) {
      values.push(sourceSystem)
      where.push(`source_system = $${values.length}`)
    }

    if (sourceAccount) {
      values.push(sourceAccount)
      where.push(`source_account = $${values.length}`)
    }

    values.push(limit)

    const sql = `
SELECT
  id,
  posted_on::text AS posted_on,
  description,
  category,
  amount::text AS amount,
  balance::text AS balance
FROM transactions
WHERE ${where.join(' AND ')}
ORDER BY posted_on DESC, id DESC
LIMIT $${values.length}
`.trim()

    const result = await client.query(sql, values)

    return (result.rows as DbTransactionRow[]).map((row): TransactionRow => {
      const dateString = String(row.posted_on)
      const iso = new Date(`${dateString}T00:00:00Z`).toISOString()

      return {
        id: String(row.id),
        date: iso,
        description: String(row.description ?? ''),
        category: row.category == null ? undefined : String(row.category),
        amount: Number.parseFloat(String(row.amount)),
        balance: row.balance == null ? undefined : Number.parseFloat(String(row.balance))
      }
    })
  })

  return {
    count: data.length,
    data
  }
})
