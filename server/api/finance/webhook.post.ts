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
  console.log('[finance/webhook] received payload from n8n', body)

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
  let normalizedPayload: any = body

  // Case 1: n8n sends `{ "body": [ ...transactions ] }`
  if (!Array.isArray(body) && Array.isArray((body as any).body) && !(body as any).transactions) {
    const { body: innerBody, ...rest } = body as any
    normalizedPayload = {
      ...rest,
      transactions: innerBody
    }
  }

  // Case 2: n8n sends a raw array of transactions
  if (Array.isArray(body)) {
    normalizedPayload = body
  }

  console.log('[finance/webhook] normalized finance payload', normalizedPayload)

  // Store the finance data
  const entry = financeStore.add(normalizedPayload)

  return {
    success: true,
    id: entry.id,
    timestamp: entry.timestamp
  }
})
