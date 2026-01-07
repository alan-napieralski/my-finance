import type { FinanceTransactionPayload } from '~/types'

type MockFinanceDataOptions = {
  now?: Date
  monthsBack?: number
}

type Rng = () => number

const hashStringToSeed = (value: string): number => {
  // FNV-1a (32-bit)
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

const mulberry32 = (seed: number): Rng => {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const randInt = (rng: Rng, min: number, max: number): number => {
  return Math.floor(rng() * (max - min + 1)) + min
}

const randMoney = (rng: Rng, min: number, max: number): number => {
  const value = min + rng() * (max - min)
  return Math.round(value * 100) / 100
}

const formatIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

const makeUtcDate = (year: number, monthIndex: number, day: number): Date => {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const safeDay = Math.min(Math.max(day, 1), lastDay)
  return new Date(Date.UTC(year, monthIndex, safeDay))
}

const pushTx = (
  list: FinanceTransactionPayload[],
  payload: Omit<FinanceTransactionPayload, 'id'> & { id: string }
) => {
  list.push(payload)
}

type MonthlyContext = {
  year: number
  monthIndex: number
  monthId: string
  rng: Rng
}

const generateIncome = (list: FinanceTransactionPayload[], ctx: MonthlyContext) => {
  pushTx(list, {
    id: `${ctx.monthId}-income-salary`,
    date: formatIsoDate(makeUtcDate(ctx.year, ctx.monthIndex, 1)),
    amount: randMoney(ctx.rng, 2800, 3800),
    category: 'income',
    description: 'Salary'
  })
}

const generateBills = (list: FinanceTransactionPayload[], ctx: MonthlyContext) => {
  pushTx(list, {
    id: `${ctx.monthId}-bills-rent`,
    date: formatIsoDate(makeUtcDate(ctx.year, ctx.monthIndex, 2)),
    amount: -randMoney(ctx.rng, 900, 1400),
    category: 'bills',
    description: 'Rent'
  })

  pushTx(list, {
    id: `${ctx.monthId}-bills-utilities`,
    date: formatIsoDate(makeUtcDate(ctx.year, ctx.monthIndex, 14)),
    amount: -randMoney(ctx.rng, 90, 220),
    category: 'bills',
    description: 'Utilities'
  })
}

const generateSubscriptions = (list: FinanceTransactionPayload[], ctx: MonthlyContext) => {
  pushTx(list, {
    id: `${ctx.monthId}-subscriptions-phone`,
    date: formatIsoDate(makeUtcDate(ctx.year, ctx.monthIndex, 6)),
    amount: -randMoney(ctx.rng, 12, 45),
    category: 'subscriptions',
    description: 'Mobile plan'
  })

  pushTx(list, {
    id: `${ctx.monthId}-subscriptions-streaming`,
    date: formatIsoDate(makeUtcDate(ctx.year, ctx.monthIndex, 9)),
    amount: -randMoney(ctx.rng, 8, 20),
    category: 'subscriptions',
    description: 'Streaming subscription'
  })
}

const generateGroceries = (list: FinanceTransactionPayload[], ctx: MonthlyContext) => {
  const groceryCount = randInt(ctx.rng, 4, 6)
  for (let i = 0; i < groceryCount; i++) {
    pushTx(list, {
      id: `${ctx.monthId}-groceries-${i + 1}`,
      date: formatIsoDate(makeUtcDate(ctx.year, ctx.monthIndex, 3 + i * 6)),
      amount: -randMoney(ctx.rng, 35, 110),
      category: 'groceries',
      description: 'Groceries'
    })
  }
}

const generateTransport = (list: FinanceTransactionPayload[], ctx: MonthlyContext) => {
  pushTx(list, {
    id: `${ctx.monthId}-transport-pass`,
    date: formatIsoDate(makeUtcDate(ctx.year, ctx.monthIndex, 4)),
    amount: -randMoney(ctx.rng, 45, 120),
    category: 'transport',
    description: 'Transport'
  })
}

const generateEatingOut = (list: FinanceTransactionPayload[], ctx: MonthlyContext) => {
  const eatingOutCount = randInt(ctx.rng, 2, 5)
  for (let i = 0; i < eatingOutCount; i++) {
    pushTx(list, {
      id: `${ctx.monthId}-eating-out-${i + 1}`,
      date: formatIsoDate(makeUtcDate(ctx.year, ctx.monthIndex, 5 + i * 5)),
      amount: -randMoney(ctx.rng, 12, 75),
      category: 'eating out',
      description: 'Eating out'
    })
  }
}

const generateRecurring = (list: FinanceTransactionPayload[], ctx: MonthlyContext) => {
  pushTx(list, {
    id: `${ctx.monthId}-recurring-gym`,
    date: formatIsoDate(makeUtcDate(ctx.year, ctx.monthIndex, 7)),
    amount: -randMoney(ctx.rng, 18, 55),
    category: 'recurring',
    description: 'Gym membership'
  })
}

const generateHobbies = (list: FinanceTransactionPayload[], ctx: MonthlyContext) => {
  pushTx(list, {
    id: `${ctx.monthId}-hobbies`,
    date: formatIsoDate(makeUtcDate(ctx.year, ctx.monthIndex, 16)),
    amount: -randMoney(ctx.rng, 10, 80),
    category: 'sport and hobbies',
    description: 'Sport & hobbies'
  })
}

const generateShopping = (list: FinanceTransactionPayload[], ctx: MonthlyContext) => {
  const shoppingCount = randInt(ctx.rng, 0, 2)
  for (let i = 0; i < shoppingCount; i++) {
    pushTx(list, {
      id: `${ctx.monthId}-shopping-${i + 1}`,
      date: formatIsoDate(makeUtcDate(ctx.year, ctx.monthIndex, 11 + i * 10)),
      amount: -randMoney(ctx.rng, 25, i === 0 ? 220 : 140),
      category: 'shopping',
      description: 'Shopping'
    })
  }
}

const generateSavings = (list: FinanceTransactionPayload[], ctx: MonthlyContext) => {
  pushTx(list, {
    id: `${ctx.monthId}-savings`,
    date: formatIsoDate(makeUtcDate(ctx.year, ctx.monthIndex, 20)),
    amount: -randMoney(ctx.rng, 100, 600),
    category: 'savings',
    description: 'Savings transfer'
  })
}

/**
 * Generates a deterministic but realistic-looking set of transactions.
 *
 * - Dates are generated relative to `now`
 * - Expenses are negative, income is positive
 * - Each month includes a stable mix of categories so MoM comparisons aren’t dominated by £0 rows
 */
export function buildMockFinanceTransactions(options: MockFinanceDataOptions = {}): FinanceTransactionPayload[] {
  const now = options.now ?? new Date()
  const monthsBack = options.monthsBack ?? 12

  const transactions: FinanceTransactionPayload[] = []

  for (let offset = 0; offset < monthsBack; offset++) {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))
    const year = monthDate.getUTCFullYear()
    const monthIndex = monthDate.getUTCMonth()
    const monthId = `${year}-${String(monthIndex + 1).padStart(2, '0')}`

    const rng = mulberry32(hashStringToSeed(monthId))

    const ctx: MonthlyContext = {
      year,
      monthIndex,
      monthId,
      rng
    }

    // Keep generation order stable so RNG consumption stays deterministic.
    generateIncome(transactions, ctx)
    generateBills(transactions, ctx)
    generateSubscriptions(transactions, ctx)
    generateGroceries(transactions, ctx)
    generateTransport(transactions, ctx)
    generateEatingOut(transactions, ctx)
    generateRecurring(transactions, ctx)
    generateHobbies(transactions, ctx)
    generateShopping(transactions, ctx)
    generateSavings(transactions, ctx)
  }

  // Oldest -> newest
  transactions.sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  return transactions
}
