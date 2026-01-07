export interface GeneralSavings {
  monthlyAmount: number
}

export interface WantPlan {
  id: string
  name: string

  /**
   * Manual fallback amount (used if target/months are not filled in).
   */
  monthlyAmount: number

  targetAmount?: number
  /**
   * Legacy field; kept for backwards compatibility/migration.
   */
  targetDate?: string

  monthsToTarget?: number

  notes?: string
}

export interface DebtPlan {
  id: string
  name: string
  totalDebt: number
  deadline: string

  /**
   * Legacy/manual value (kept for backwards compatibility).
   * The UI now calculates the monthly payment based on total debt and deadline.
   */
  monthlyPayment?: number

  interestRate?: number
  notes?: string
}

export interface RecurringPayment {
  id: string
  name: string
  monthlyAmount: number
  category?: string
  notes?: string
}
