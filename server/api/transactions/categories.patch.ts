import { z } from 'zod'
import type { UpdateBatchResult, UpdatedCategory } from '~/types'
import { withPgClient } from '../../utils/db'

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

const updateSchema = z.object({
  id: z.string().uuid(),
  category: z.string().trim().max(100).nullable()
})

const requestSchema = z.object({
  updates: z.array(updateSchema).min(1).max(2000)
}).superRefine((value, ctx) => {
  const seen = new Set<string>()

  value.updates.forEach((update, index) => {
    if (seen.has(update.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate transaction id in updates array',
        path: ['updates', index, 'id']
      })
      return
    }

    seen.add(update.id)
  })
})

const buildBulkUpdateQuery = (updates: Array<{ id: string, category: string | null }>) => {
  const values: unknown[] = []
  const tuples: string[] = []

  for (let i = 0; i < updates.length; i++) {
    const base = i * 2
    values.push(updates[i]!.id, updates[i]!.category)
    tuples.push(`($${base + 1}::uuid, $${base + 2}::text)`)
  }

  const text = `
UPDATE transactions t
SET category = v.category
FROM (VALUES ${tuples.join(', ')}) AS v(id, category)
WHERE t.id = v.id
RETURNING t.id, t.category
`.trim()

  return { text, values }
}

export default eventHandler(async (event) => {
  const body = await readBody(event)

  const parsed = requestSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Invalid payload'
    })
  }

  const updates = parsed.data.updates.map((update) => {
    const trimmed = typeof update.category === 'string' ? update.category.trim() : null

    // Normalize empty/whitespace-only categories to null so "Uncategorized" round-trips cleanly.
    return {
      id: update.id,
      category: trimmed ? trimmed : null
    }
  })

  const CHUNK_SIZE = 500

  const result = await withPgClient(async (client) => {
    const updated: UpdatedCategory[] = []

    await client.query('BEGIN')

    try {
      for (const batch of chunk(updates, CHUNK_SIZE)) {
        const { text, values } = buildBulkUpdateQuery(batch)
        const res = await client.query(text, values)

        for (const row of res.rows as Array<{ id: string, category: string | null }>) {
          updated.push({
            id: String(row.id),
            category: row.category == null ? null : String(row.category)
          })
        }
      }

      await client.query('COMMIT')

      const payload: UpdateBatchResult = { updated }
      return payload
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  })

  return {
    success: true,
    updatedCount: result.updated.length,
    updated: result.updated
  }
})
