import { readBody, type H3Event } from 'h3'
import { assertApiKey } from '../auth'
import { withPgClient } from '../db'
import { parseFinanceIngestBody } from './parseIngestBody'
import { ingestFinanceTransactions } from './ingest'

export async function handleFinanceIngest(event: H3Event) {
  assertApiKey(event)

  const body = await readBody(event)
  const parsed = parseFinanceIngestBody(body)

  return await withPgClient(async (client) => {
    return await ingestFinanceTransactions({
      client,
      sourceSystem: parsed.sourceSystem,
      sourceAccount: parsed.sourceAccount,
      transactions: parsed.transactions,
      meta: parsed.meta
    })
  })
}
