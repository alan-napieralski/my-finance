import { withPgClient } from '../../utils/db'
import { listIncomeRuleDescriptions } from '../../utils/transactions/incomeRules'

export default eventHandler(async () => {
  const descriptions = await withPgClient(async (client) => {
    return await listIncomeRuleDescriptions(client)
  })

  return { descriptions }
})
