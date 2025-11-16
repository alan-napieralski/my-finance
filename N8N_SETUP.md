# n8n Integration Setup

## Overview
Your Nuxt app can now receive finance data from n8n via a secure webhook endpoint.

## Setup Instructions

### 1. Configure Environment Variables

Create a `.env` file in your project root (or update existing one):

```bash
NUXT_API_KEY=your-secure-random-api-key
```

Generate a secure API key:
```bash
# On macOS/Linux:
openssl rand -hex 32
```

### 2. Start Your Nuxt App

```bash
pnpm dev
```

Your app will run on `http://localhost:3000`

### 3. Configure n8n Workflow

In your n8n workflow (after the Telegram trigger):

#### Add HTTP Request Node
1. **Method**: POST
2. **URL**: `http://your-domain:3000/api/finance/webhook`
   - For local development: `http://localhost:3000/api/finance/webhook`
   - For production: `https://yourdomain.com/api/finance/webhook`
3. **Authentication**: None (we'll use headers)
4. **Headers**:
   - Name: `Authorization`
   - Value: `Bearer your-secure-random-api-key`
5. **Body Content Type**: JSON
6. **Body**: Send your finance data as JSON

Example body structure:
```json
{
  "type": "monthly_report",
  "date": "2025-11-16",
  "income": 5000,
  "expenses": 3000,
  "balance": 2000,
  "transactions": [
    {
      "date": "2025-11-15",
      "description": "Salary",
      "amount": 5000
    }
  ]
}
```

### 4. Access Data in Your Nuxt App

#### Fetch Latest Finance Data
```typescript
// In any component or composable
const { data: financeData } = await useFetch('/api/finance/latest')
```

#### Fetch All Finance Data
```typescript
// Get last 50 entries (default)
const { data: allData } = await useFetch('/api/finance')

// Get specific number of entries
const { data: limitedData } = await useFetch('/api/finance?limit=10')
```

## API Endpoints

### POST `/api/finance/webhook`
Receives finance data from n8n
- **Auth**: Bearer token in Authorization header
- **Body**: JSON object with your finance data
- **Response**: `{ success: true, id: string, timestamp: string }`

### GET `/api/finance/latest`
Returns the most recent finance data entry
- **Auth**: None
- **Response**: `{ id: string, timestamp: string, data: {...} }`

### GET `/api/finance?limit=50`
Returns all finance data entries
- **Auth**: None
- **Query Params**: `limit` (optional, default: 50)
- **Response**: `{ count: number, data: [...] }`

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

**Current Implementation**: In-memory storage (data persists only while app is running)
- Stores last 100 entries
- Data is lost on server restart

**For Production**: Consider integrating a database:
- Supabase
- Prisma with PostgreSQL
- MongoDB
- Firebase

Update `server/utils/financeStore.ts` to use your chosen database.

## Testing

Test the webhook locally with curl:

```bash
curl -X POST http://localhost:3000/api/finance/webhook \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "amount": 1000,
    "date": "2025-11-16"
  }'
```

Then fetch it:
```bash
curl http://localhost:3000/api/finance/latest
```
