import { handleFinanceIngest } from '../../utils/transactions/handleFinanceIngest'

export default eventHandler(async (event) => {
  // Backwards-compatible endpoint name for n8n.
  // Prefer POST /api/finance/ingest going forward.
  const result = await handleFinanceIngest(event)

  return {
    success: true,
    ...result
  }
})
