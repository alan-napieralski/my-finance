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

    // Income (salary)
    pushTx(transactions, {
      id: `${monthId}-income-salary`,
      date: formatIsoDate(makeUtcDate(year, monthIndex, 1)),
      amount: randMoney(rng, 2800, 3800),
      category: 'income',
      description: 'Salary'
    })

    // Bills
    pushTx(transactions, {
      id: `${monthId}-bills-rent`,
      date: formatIsoDate(makeUtcDate(year, monthIndex, 2)),
      amount: -randMoney(rng, 900, 1400),
      category: 'bills',
      description: 'Rent'
    })

    pushTx(transactions, {
      id: `${monthId}-bills-utilities`,
      date: formatIsoDate(makeUtcDate(year, monthIndex, 14)),
      amount: -randMoney(rng, 90, 220),
      category: 'bills',
      description: 'Utilities'
    })

    // Subscriptions
    pushTx(transactions, {
      id: `${monthId}-subscriptions-phone`,
      date: formatIsoDate(makeUtcDate(year, monthIndex, 6)),
      amount: -randMoney(rng, 12, 45),
      category: 'subscriptions',
      description: 'Mobile plan'
    })

    pushTx(transactions, {
      id: `${monthId}-subscriptions-streaming`,
      date: formatIsoDate(makeUtcDate(year, monthIndex, 9)),
      amount: -randMoney(rng, 8, 20),
      category: 'subscriptions',
      description: 'Streaming subscription'
    })

    // Groceries (weekly-ish)
    const groceryCount = randInt(rng, 4, 6)
    for (let i = 0; i < groceryCount; i++) {
      pushTx(transactions, {
        id: `${monthId}-groceries-${i + 1}`,
        date: formatIsoDate(makeUtcDate(year, monthIndex, 3 + i * 6)),
        amount: -randMoney(rng, 35, 110),
        category: 'groceries',
        description: 'Groceries'
      })
    }

    // Transport (mix of pass/fuel)
    pushTx(transactions, {
      id: `${monthId}-transport-pass`,
      date: formatIsoDate(makeUtcDate(year, monthIndex, 4)),
      amount: -randMoney(rng, 45, 120),
      category: 'transport',
      description: 'Transport'
    })

    // Eating out
    const eatingOutCount = randInt(rng, 2, 5)
    for (let i = 0; i < eatingOutCount; i++) {
      pushTx(transactions, {
        id: `${monthId}-eating-out-${i + 1}`,
        date: formatIsoDate(makeUtcDate(year, monthIndex, 5 + i * 5)),
        amount: -randMoney(rng, 12, 75),
        category: 'eating out',
        description: 'Eating out'
      })
    }

    // Recurring (e.g. gym)
    pushTx(transactions, {
      id: `${monthId}-recurring-gym`,
      date: formatIsoDate(makeUtcDate(year, monthIndex, 7)),
      amount: -randMoney(rng, 18, 55),
      category: 'recurring',
      description: 'Gym membership'
    })

    // Sport and hobbies
    pushTx(transactions, {
      id: `${monthId}-hobbies`,
      date: formatIsoDate(makeUtcDate(year, monthIndex, 16)),
      amount: -randMoney(rng, 10, 80),
      category: 'sport and hobbies',
      description: 'Sport & hobbies'
    })

    // Shopping (0–2 per month)
    const shoppingCount = randInt(rng, 0, 2)
    for (let i = 0; i < shoppingCount; i++) {
      pushTx(transactions, {
        id: `${monthId}-shopping-${i + 1}`,
        date: formatIsoDate(makeUtcDate(year, monthIndex, 11 + i * 10)),
        amount: -randMoney(rng, 25, i === 0 ? 220 : 140),
        category: 'shopping',
        description: 'Shopping'
      })
    }

    // Savings (treat as an outflow so it shows up under the Savings main category)
    pushTx(transactions, {
      id: `${monthId}-savings`,
      date: formatIsoDate(makeUtcDate(year, monthIndex, 20)),
      amount: -randMoney(rng, 100, 600),
      category: 'savings',
      description: 'Savings transfer'
    })
  }

  // Oldest -> newest
  transactions.sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime()
  })

  return transactions
}
