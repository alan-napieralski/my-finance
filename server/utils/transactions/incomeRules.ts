import type { DbClient } from '../db'

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

export const normalizeIncomeRule = (value: string): { description: string, descriptionKey: string } => {
  const description = normalizeWhitespace(value)
  const descriptionKey = description.toLowerCase()
  return { description, descriptionKey }
}

export async function listIncomeRuleDescriptions(client: DbClient): Promise<string[]> {
  try {
    const result = await client.query('SELECT description FROM income_rules ORDER BY description ASC')
    return (result.rows as Array<{ description: string }>).map(r => String(r.description))
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined
    if (code === '42P01') {
      return []
    }

    throw error
  }
}

export async function fetchIncomeRuleKeys(client: DbClient): Promise<Set<string>> {
  try {
    const result = await client.query('SELECT description_key FROM income_rules')
    return new Set((result.rows as Array<{ description_key: string }>).map(r => String(r.description_key)))
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined
    if (code === '42P01') {
      return new Set()
    }

    throw error
  }
}

export async function recategorizeIncomeTransactions(client: DbClient, descriptionKeys: string[]) {
  if (descriptionKeys.length === 0) {
    const cleared = await client.query(
      'UPDATE transactions SET category = NULL WHERE category = \'income\''
    )

    return {
      categorized: 0,
      decategorized: cleared.rowCount ?? 0
    }
  }

  const unset = await client.query(
    'UPDATE transactions SET category = NULL WHERE category = \'income\' AND (amount <= 0 OR LOWER(description) <> ALL($1::text[]))',
    [descriptionKeys]
  )

  const set = await client.query(
    'UPDATE transactions SET category = \'income\' WHERE amount > 0 AND LOWER(description) = ANY($1::text[])',
    [descriptionKeys]
  )

  return {
    categorized: set.rowCount ?? 0,
    decategorized: unset.rowCount ?? 0
  }
}
