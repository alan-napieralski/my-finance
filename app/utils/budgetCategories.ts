import type { MainCategory } from '~/types'

// Map subcategories to main categories.
// Centralized here so adding/updating categories doesn’t require touching component logic.
export const subcategoryToMainCategory: Record<string, MainCategory> = {
  // Needs
  'bills': 'needs',
  'subscriptions': 'needs',
  'groceries': 'needs',
  'transport': 'needs',
  'recurring': 'needs',
  'eating out': 'needs',
  // Wants
  'sport and hobbies': 'wants',
  'shopping': 'wants',
  'other': 'wants',
  'uncategorized': 'wants',
  // Savings
  'savings': 'savings'
}

export const mainCategories: MainCategory[] = ['needs', 'wants', 'savings']

export const getMainCategory = (subcategory: string): MainCategory => {
  const key = subcategory.toLowerCase()

  // Default unknown categories to 'wants' (discretionary spending) to keep the UI predictable.
  return subcategoryToMainCategory[key] ?? 'wants'
}
