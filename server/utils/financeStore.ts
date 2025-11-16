// In-memory store for finance data
// For production, consider using a database like Supabase, Prisma, or similar

export interface FinanceData {
  id: string
  timestamp: string
  data: Record<string, any>
}

let financeData: FinanceData[] = []

export const financeStore = {
  add(data: Record<string, any>) {
    const entry: FinanceData = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      data
    }
    financeData.unshift(entry) // Add to beginning
    // Keep only last 100 entries
    if (financeData.length > 100) {
      financeData = financeData.slice(0, 100)
    }
    return entry
  },

  getLatest() {
    return financeData[0] || null
  },

  getAll(limit = 50) {
    return financeData.slice(0, limit)
  },

  clear() {
    financeData = []
  }
}
