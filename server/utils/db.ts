import path from 'node:path'
import process from 'node:process'
import dotenv from 'dotenv'
import { createError } from 'h3'
import { Client, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

export type DbClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[], rowCount?: number | null }>
}

const resolveRuntimeDatabaseUrl = (): string => {
  const config = useRuntimeConfig() as { databaseUrl?: string }
  return config.databaseUrl?.trim() ?? ''
}

const resolveDatabaseConfig = (): {
  runtimeUrl: string
  envDatabaseUrl: string
  postgresUrl: string
  postgresNonPoolingUrl: string
  neonDatabaseUrl: string
} => {
  return {
    runtimeUrl: resolveRuntimeDatabaseUrl(),
    envDatabaseUrl: process.env.DATABASE_URL?.trim() ?? '',
    postgresUrl: process.env.POSTGRES_URL?.trim() ?? '',
    postgresNonPoolingUrl: process.env.POSTGRES_URL_NON_POOLING?.trim() ?? '',
    neonDatabaseUrl: process.env.NEON_DATABASE_URL?.trim() ?? ''
  }
}

const resolveConnectionString = (): string => {
  const { runtimeUrl, envDatabaseUrl, postgresUrl, postgresNonPoolingUrl, neonDatabaseUrl } = resolveDatabaseConfig()
  return envDatabaseUrl || postgresUrl || postgresNonPoolingUrl || neonDatabaseUrl || runtimeUrl
}

export async function withPgClient<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  const connectionString = resolveConnectionString()

  if (!connectionString) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Database not configured. Set DATABASE_URL (Neon), POSTGRES_URL (Vercel integration), or NUXT_DATABASE_URL.'
    })
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    return await fn(client as unknown as DbClient)
  } finally {
    await client.end()
  }
}
