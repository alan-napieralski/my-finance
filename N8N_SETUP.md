# n8n Integration Setup

## Overview
Your Nuxt app can now receive finance data from n8n via a secure webhook endpoint.

## Setup Instructions

### 1. Configure Environment Variables

Create a `.env` file in your project root (or update existing one):

```bash
# API key for inbound n8n ingestion requests
NUXT_API_KEY=your-secure-random-api-key

# Postgres connection string (server-side only)
# Local via docker-compose:
NUXT_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/my_finance
```

Generate a secure API key:
```bash
# On macOS/Linux:
openssl rand -hex 32
```

### 2. Set up the database schema

Apply the migration in `server/db/migrations/001_init.sql` to your Postgres database (the app expects `transactions` and `ingest_runs`).

### 3. Start Your Nuxt App

```bash
pnpm dev
```

Your app will run on `http://localhost:3000`

### 4. Configure n8n Workflow

In your n8n workflow (after the Telegram trigger):

#### Add HTTP Request Node
1. **Method**: POST
2. **URL**: `http://your-domain:3000/api/finance/ingest`
   - Local development: `http://localhost:3000/api/finance/ingest`
   - Production: `https://yourdomain.com/api/finance/ingest`
   - Backwards-compatible alias: `.../api/finance/webhook`
3. **Authentication**: Header auth (Bearer token)
4. **Headers**:
   - `Authorization: Bearer <NUXT_API_KEY>`
   - `Content-Type: application/json`
5. **Body Content Type**: JSON
6. **Body**: Send your transactions as JSON (raw array supported)

Example body (recommended for now):
```json
[
  {
    "date": "2025-11-15",
    "description": "Salary",
    "amount": 5000,
    "balance": 12000
  }
]
```

Optional body (advanced):
```json
{
  "source_system": "bank-main",
  "source_account": "checking",
  "transactions": [
    {
      "date": "2025-11-15",
      "description": "Salary",
      "amount": 5000,
      "balance": 12000
    }
  ]
}
```

Notes:
- If `source_system` is omitted, the server uses a default value.
- Deduping is enforced in Postgres via a unique `(source_system, fingerprint)` constraint.

### 5. Access Data in Your Nuxt App

#### Fetch Transactions (recommended)
```typescript
// In any component or composable
const { data } = await useFetch('/api/transactions', {
  query: {
    start: '2025-11-01',
    end: '2025-11-30',
    limit: 20000
  }
})
```

## API Endpoints

### POST `/api/finance/ingest`
Receives transactions from n8n and inserts them idempotently
- **Auth**: Required (`Authorization: Bearer <NUXT_API_KEY>`)
- **Body**: either a raw JSON array of transactions, or an object with `transactions: []`.
- **Success Response**:
  - `{ success: true, runId: string, receivedAt: string, rowsSeen: number, rowsInserted: number, rowsSkippedDuplicates: number }`

### POST `/api/finance/webhook`
Backwards-compatible alias for `/api/finance/ingest`

### GET `/api/transactions?start=YYYY-MM-DD&end=YYYY-MM-DD&limit=20000`
Returns transactions within the requested range
- **Auth**: None
- **Query Params**:
  - `start`, `end` (required)
  - `limit` (optional, default: 5000, max: 20000)
  - `source_system`, `source_account` (optional)
- **Response**: `{ count: number, data: TransactionRow[] }`

## Production Deployment

### Using a Public Domain
If your Nuxt app is deployed (e.g., Vercel, Netlify, etc.):
1. Update n8n HTTP Request URL to your production domain
2. Ensure your `.env` variables are set in your hosting platform
3. n8n can directly POST to your public endpoint

### Local Development with n8n Cloud
If n8n is in the cloud but you're developing locally, use a tunnel:

```bash
# Using ngrok
ngrok http 3000

# Then use the ngrok URL in n8n:
# https://abc123.ngrok.io/api/finance/webhook
```

## Storage Notes

**Current Implementation**: PostgreSQL is the source of truth for transactions.

- Idempotency is enforced at the DB layer via a unique constraint on `(source_system, fingerprint)`.
- If you post a raw array (no `source_system`), the server uses a default `source_system`.
- The legacy in-memory store (`server/utils/financeStore.ts`) is no longer used for ingestion.

## Testing

Test the ingestion endpoint locally with curl:

```bash
curl -X POST http://localhost:3000/api/finance/ingest \
  -H "Authorization: Bearer $NUXT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '[
    {
      "date": "16/11/2025",
      "description": "Test transaction",
      "amount": -50.00
    }
  ]'
```

Then fetch transactions:
```bash
curl "http://localhost:3000/api/transactions?start=2025-11-01&end=2025-11-30&limit=20000"
```
