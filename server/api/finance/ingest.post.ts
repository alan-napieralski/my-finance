import { handleFinanceIngest } from '../../utils/transactions/handleFinanceIngest'

export default eventHandler(async (event) => {
  const result = await handleFinanceIngest(event)

  return {
    success: true,
    ...result
  }
})
