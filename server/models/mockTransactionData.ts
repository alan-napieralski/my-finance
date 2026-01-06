import type { FinanceTransactionPayload } from '~/types'

const transactionPayloadMock: FinanceTransactionPayload[] = [
  {
    id: '1',
    date: '2024-12-01',
    amount: 200.00,
    category: 'bills',
    description: 'Electricity bill'
  },
  {
    id: '2',
    date: '2024-12-10',
    amount: 120.00,
    category: 'subscriptions',
    description: 'Netflix subscription'
  },
  {
    id: '3',
    date: '2024-12-15',
    amount: 80.00,
    category: 'groceries',
    description: 'Weekly grocery shopping'
  },
  {
    id: '4',
    date: '2024-12-20',
    amount: 50.00,
    category: 'transport',
    description: 'Fuel for car'
  },
  {
    id: '5',
    date: '2024-12-25',
    amount: 30.00,
    category: 'recurring',
    description: 'Monthly gym membership'
  },
  {
    id: '6',
    date: '2024-12-30',
    amount: 60.00,
    category: 'eating out',
    description: 'Dinner at restaurant'
  },
  {
    id: '7',
    date: '2025-01-05',
    amount: 120.00,
    category: 'sport and hobbies',
    description: 'Table tennis club membership'
  },
  {
    id: '8',
    date: '2025-01-10',
    amount: 150.00,
    category: 'shopping',
    description: 'New backpack purchase'
  },
  {
    id: '9',
    date: '2025-01-15',
    amount: 180.00,
    category: 'bills',
    description: 'Internet bill'
  },
  {
    id: '10',
    date: '2025-01-20',
    amount: 90.00,
    category: 'groceries',
    description: 'Weekly grocery shopping'
  },
  {
    id: '11',
    date: '2025-01-25',
    amount: 40.00,
    category: 'transport',
    description: 'Public transport pass'
  },
  {
    id: '12',
    date: '2025-01-30',
    amount: 70.00,
    category: 'eating out',
    description: 'Lunch with colleague'
  },
  {
    id: '13',
    date: '2025-02-05',
    amount: 300.00,
    category: 'savings',
    description: 'Regular savings deposit'
  },
  {
    id: '14',
    date: '2025-02-10',
    amount: 100.00,
    category: 'subscriptions',
    description: 'Music streaming service'
  },
  {
    id: '15',
    date: '2025-02-15',
    amount: 50.00,
    category: 'sport and hobbies',
    description: 'Running shoe purchase'
  },
  {
    id: '16',
    date: '2025-02-20',
    amount: 200.00,
    category: 'shopping',
    description: 'Phone accessory purchase'
  },
  {
    id: '17',
    date: '2025-02-25',
    amount: 120.00,
    category: 'groceries',
    description: 'Weekly grocery shopping'
  },
  {
    id: '18',
    date: '2025-02-28',
    amount: 80.00,
    category: 'transport',
    description: 'Fuel for car'
  },
  {
    id: '19',
    date: '2025-03-05',
    amount: 150.00,
    category: 'eating out',
    description: 'Dinner at Italian restaurant'
  },
  {
    id: '20',
    date: '2025-03-10',
    amount: 200.00,
    category: 'bills',
    description: 'Water bill'
  },
  {
    id: '21',
    date: '2025-03-15',
    amount: 70.00,
    category: 'sport and hobbies',
    description: 'Yoga class subscription'
  },
  {
    id: '22',
    date: '2025-03-20',
    amount: 180.00,
    category: 'shopping',
    description: 'New laptop purchase'
  },
  {
    id: '23',
    date: '2025-03-25',
    amount: 250.00,
    category: 'savings',
    description: 'Holiday savings deposit'
  },
  {
    id: '24',
    date: '2025-03-30',
    amount: 90.00,
    category: 'groceries',
    description: 'Weekly grocery shopping'
  },
  {
    id: '25',
    date: '2025-04-01',
    amount: 60.00,
    category: 'transport',
    description: 'Fuel for car'
  },
  {
    id: '26',
    date: '2025-04-05',
    amount: 100.00,
    category: 'subscriptions',
    description: 'Language learning app'
  },
  {
    id: '27',
    date: '2025-04-10',
    amount: 50.00,
    category: 'sport and hobbies',
    description: 'Gym equipment purchase'
  },
  {
    id: '28',
    date: '2025-04-15',
    amount: 120.00,
    category: 'shopping',
    description: 'Home decor purchase'
  },
  {
    id: '29',
    date: '2025-04-20',
    amount: 200.00,
    category: 'groceries',
    description: 'Weekly grocery shopping'
  },
  {
    id: '30',
    date: '2025-04-25',
    amount: 70.00,
    category: 'transport',
    description: 'Public transport pass'
  },
  {
    id: '31',
    date: '2025-04-30',
    amount: 90.00,
    category: 'eating out',
    description: 'Lunch at cafe'
  },
  {
    id: '32',
    date: '2025-05-05',
    amount: 300.00,
    category: 'bills',
    description: 'Utility bill'
  },
  {
    id: '33',
    date: '2025-05-10',
    amount: 150.00,
    category: 'savings',
    description: 'Emergency fund deposit'
  },
  {
    id: '34',
    date: '2025-05-15',
    amount: 80.00,
    category: 'sport and hobbies',
    description: 'Hiking gear purchase'
  },
  {
    id: '35',
    date: '2025-05-20',
    amount: 180.00,
    category: 'shopping',
    description: 'Books purchase'
  },
  {
    id: '36',
    date: '2025-05-25',
    amount: 120.00,
    category: 'groceries',
    description: 'Weekly grocery shopping'
  },
  {
    id: '37',
    date: '2025-05-30',
    amount: 60.00,
    category: 'transport',
    description: 'Fuel for car'
  },
  {
    id: '38',
    date: '2025-06-05',
    amount: 100.00,
    category: 'subscriptions',
    description: 'Online course'
  },
  {
    id: '39',
    date: '2025-06-10',
    amount: 150.00,
    category: 'sport and hobbies',
    description: 'Cycling gear purchase'
  },
  {
    id: '40',
    date: '2025-06-15',
    amount: 90.00,
    category: 'shopping',
    description: 'Tech accessories purchase'
  },
  {
    id: '41',
    date: '2025-06-20',
    amount: 200.00,
    category: 'groceries',
    description: 'Weekly grocery shopping'
  },
  {
    id: '42',
    date: '2025-06-25',
    amount: 70.00,
    category: 'transport',
    description: 'Public transport pass'
  },
  {
    id: '43',
    date: '2025-06-30',
    amount: 120.00,
    category: 'eating out',
    description: 'Dinner at seafood restaurant'
  },
  {
    id: '44',
    date: '2025-07-05',
    amount: 300.00,
    category: 'bills',
    description: 'Internet and mobile bill'
  },
  {
    id: '45',
    date: '2025-07-10',
    amount: 150.00,
    category: 'savings',
    description: 'Annual savings goal'
  },
  {
    id: '46',
    date: '2025-07-15',
    amount: 80.00,
    category: 'sport and hobbies',
    description: 'Gym equipment purchase'
  },
  {
    id: '47',
    date: '2025-07-20',
    amount: 180.00,
    category: 'shopping',
    description: 'Home electronics purchase'
  },
  {
    id: '48',
    date: '2025-07-25',
    amount: 120.00,
    category: 'groceries',
    description: 'Weekly grocery shopping'
  },
  {
    id: '49',
    date: '2025-07-30',
    amount: 60.00,
    category: 'transport',
    description: 'Fuel for car'
  },
  {
    id: '50',
    date: '2025-08-05',
    amount: 100.00,
    category: 'subscriptions',
    description: 'Streaming platform'
  }
]

export {
  transactionPayloadMock
}
