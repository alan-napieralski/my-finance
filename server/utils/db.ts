import type { PoolClient } from 'pg'
import { Pool as PgPool } from 'pg'
import { createError } from 'h3'

const globalForPg = globalThis as typeof globalThis & { __myFinancePgPool?: PgPool }

let pool: PgPool | null = globalForPg.__myFinancePgPool ?? null

const resolveDatabaseUrl = (): string => {
  const config = useRuntimeConfig() as { databaseUrl?: string }
  const fromRuntimeConfig = config.databaseUrl?.trim()
  const fromEnv = process.env.DATABASE_URL?.trim()

  return fromRuntimeConfig || fromEnv || ''
}

const resolveSsl = (databaseUrl: string): { rejectUnauthorized: boolean } | undefined => {
  const sslModeFromEnv = process.env.PGSSLMODE?.toLowerCase()

  try {
    const url = new URL(databaseUrl)
    const sslModeFromUrl = url.searchParams.get('sslmode')?.toLowerCase()
    const sslmode = sslModeFromUrl || sslModeFromEnv

    if (!sslmode || sslmode === 'disable' || sslmode === 'false' || sslmode === '0') {
      return undefined
    }

    return { rejectUnauthorized: false }
  } catch {
    // If DATABASE_URL isn't parseable as a URL, don't guess SSL.
    return sslModeFromEnv ? { rejectUnauthorized: false } : undefined
  }
}

export function getPgPool(): PgPool {
  if (pool) {
    return pool
  }

  const databaseUrl = resolveDatabaseUrl()

  if (!databaseUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Database not configured. Set NUXT_DATABASE_URL (preferred) or DATABASE_URL.'
    })
  }

  pool = new PgPool({
    connectionString: databaseUrl,
    ssl: resolveSsl(databaseUrl),
    max: Number(process.env.PGPOOL_MAX ?? 10)
  })

  globalForPg.__myFinancePgPool = pool

  return pool
}

export async function withPgClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPgPool().connect()

  try {
    return await fn(client)
  } finally {
    client.release()
  }
}
