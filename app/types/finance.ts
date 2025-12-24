export interface FinanceTransactionPayload {
  id?: string
  date: string
  amount: string | number
  balance?: string | number
  category?: string
  description?: string
}

export interface FinanceEntry {
  id: string
  timestamp: string
  data: { transactions?: FinanceTransactionPayload[] } | FinanceTransactionPayload[]
}

export interface TransactionRow {
  id: string
  date: string
  description: string
  category?: string
  amount: number
  balance?: number
}

export interface Transaction {
  date: Date
  amount: number
  category: string
  description: string
}

export type SortField = 'date' | 'amount' | 'balance'
export type SortDirection = 'asc' | 'desc'
