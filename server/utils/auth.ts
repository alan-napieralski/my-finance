import crypto from 'node:crypto'
import { createError, getHeader, type H3Event } from 'h3'

const timingSafeEqual = (a: string, b: string): boolean => {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)

  if (aBuf.length !== bBuf.length) {
    return false
  }

  return crypto.timingSafeEqual(aBuf, bBuf)
}

export function assertApiKey(event: H3Event) {
  const apiKey = (useRuntimeConfig() as { apiKey?: string }).apiKey?.trim()

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server API key is not configured. Set NUXT_API_KEY.'
    })
  }

  const authHeader = getHeader(event, 'authorization') ?? ''
  const providedKey = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : ''

  if (!providedKey || !timingSafeEqual(providedKey, apiKey)) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: Invalid API key'
    })
  }
}
