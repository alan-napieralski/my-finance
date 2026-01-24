import { defineEventHandler, getHeader, setHeader, setResponseStatus } from 'h3'

const allowedOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000'
])

export default defineEventHandler((event) => {
  // Only apply CORS to API routes.
  if (!event.path.startsWith('/api/')) {
    return
  }

  const origin = getHeader(event, 'origin')

  if (!origin || !allowedOrigins.has(origin)) {
    return
  }

  setHeader(event, 'Access-Control-Allow-Origin', origin)
  setHeader(event, 'Access-Control-Allow-Credentials', 'true')
  setHeader(event, 'Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, Authorization, CF-Access-Client-Id, CF-Access-Client-Secret')
  setHeader(event, 'Vary', 'Origin')

  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 204)
    return ''
  }
})
