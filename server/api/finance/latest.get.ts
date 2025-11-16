import { financeStore } from '../../utils/financeStore'

export default eventHandler(async () => {
  const latest = financeStore.getLatest()

  if (!latest) {
    throw createError({
      statusCode: 404,
      statusMessage: 'No finance data available'
    })
  }

  return latest
})
