import { z } from 'zod'
import { withPgClient } from '../../utils/db'
import { listIncomeRuleDescriptions, normalizeIncomeRule, recategorizeIncomeTransactions } from '../../utils/transactions/incomeRules'

const bodySchema = z.object({
  descriptions: z.array(z.string().trim().max(200)).max(50)
})

export default eventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = bodySchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Invalid payload'
    })
  }

  const normalized = parsed.data.descriptions
    .map(value => value.trim())
    .filter(Boolean)
    .map(normalizeIncomeRule)

  const keys = normalized.map(r => r.descriptionKey)

  // Reject duplicates after normalization (case-insensitive).
  const keySet = new Set<string>()
  for (const key of keys) {
    if (keySet.has(key)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Duplicate income descriptions are not allowed'
      })
    }
    keySet.add(key)
  }

  let descriptions: string[]

  try {
    descriptions = await withPgClient(async (client) => {
      await client.query('BEGIN')

      try {
        await client.query('DELETE FROM income_rules')

        for (const rule of normalized) {
          await client.query(
            'INSERT INTO income_rules (description, description_key) VALUES ($1, $2)',
            [rule.description, rule.descriptionKey]
          )
        }

        await recategorizeIncomeTransactions(client, keys)

        await client.query('COMMIT')

        return await listIncomeRuleDescriptions(client)
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
        statusMessage: 'Income rules table is missing. Apply server/db/migrations/002_income_rules.sql to your database.'
      })
    }

    throw error
  }

  return { descriptions }
})
