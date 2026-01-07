export interface DbTransactionRow {
  id: string
  posted_on: string
  description: string
  category: string | null
  amount: string
  balance: string | null
}
