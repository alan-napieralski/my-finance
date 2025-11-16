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

  if (!body || typeof body !== 'object') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request: Invalid data format'
    })
  }

  // Store the finance data
  const entry = financeStore.add(body)

  return {
    success: true,
    id: entry.id,
    timestamp: entry.timestamp
  }
})
