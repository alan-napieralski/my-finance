import { financeStore } from '../../utils/financeStore'

export default eventHandler(async (event) => {
  // TEMPORARILY DISABLED FOR TESTING
  // TODO: Re-enable auth after testing

  // Get API key from environment
  // const apiKey = useRuntimeConfig().apiKey

  // Check API key authentication
  // const authHeader = getHeader(event, 'authorization')
  // const providedKey = authHeader?.replace('Bearer ', '')

  // if (!apiKey || providedKey !== apiKey) {
  //   throw createError({
  //     statusCode: 401,
  //     statusMessage: 'Unauthorized: Invalid API key'
  //   })
  // }

  // Parse the incoming data from n8n
  const body = await readBody(event)

  // Debug: log raw payload from n8n when data is received

  if (!body || (typeof body !== 'object' && !Array.isArray(body))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Invalid data format'
    })
  }

  // Normalise incoming payload so the frontend can always read transactions
  // Home* components currently expect either:
  // - payload.transactions: Transaction[]
  // - or payload: Transaction[] directly
  let normalizedPayload: unknown = body

  // Case 1: n8n sends `{ "body": [ ...transactions ] }`
  if (!Array.isArray(body) && typeof body === 'object' && 'body' in body && Array.isArray(body.body) && !('transactions' in body)) {
    const { body: innerBody, ...rest } = body as Record<string, unknown>
    normalizedPayload = {
      ...rest,
      transactions: innerBody
    }
  }

  // Case 2: n8n sends a raw array of transactions
  if (Array.isArray(body)) {
    normalizedPayload = body
  }

  // Store the finance data
  const entry = financeStore.add(normalizedPayload)

  return {
    success: true,
    id: entry.id,
    timestamp: entry.timestamp
  }
})
