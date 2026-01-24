import { defineEventHandler, getHeader, setHeader, setResponseStatus } from 'h3'

const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
]

const normalizeOrigin = (value: string): string => {
  return value.trim().replace(/\/+$/, '')
}

const parseAllowedOrigins = (raw: string | undefined): string[] => {
  const value = raw?.trim()

  if (!value) {
    return defaultAllowedOrigins
  }

  const parsed = value
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean)

  return parsed.length > 0 ? parsed : defaultAllowedOrigins
}

const allowedOrigins = new Set(parseAllowedOrigins(process.env.ALLOWED_ORIGINS))

export default defineEventHandler((event) => {
  // Only apply CORS to API routes.
  if (!event.path.startsWith('/api/')) {
    return
  }

  const originHeader = getHeader(event, 'origin')
  const origin = originHeader ? normalizeOrigin(originHeader) : undefined

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
