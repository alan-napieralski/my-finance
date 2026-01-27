import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import dotenv from 'dotenv'

import { Client, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

neonConfig.webSocketConstructor = ws

const resolveConnectionString = () => {
  const nonPooling = process.env.POSTGRES_URL_NON_POOLING?.trim()
  const databaseUrl = process.env.DATABASE_URL?.trim()
  const nuxt = process.env.NUXT_DATABASE_URL?.trim()
  const postgresUrl = process.env.POSTGRES_URL?.trim()
  const neonDatabaseUrl = process.env.NEON_DATABASE_URL?.trim()

  return databaseUrl || postgresUrl || nonPooling || neonDatabaseUrl || nuxt || ''
}

const run = async () => {
  const connectionString = resolveConnectionString()

  if (!connectionString) {
    throw new Error('Database not configured. Set POSTGRES_URL_NON_POOLING (Vercel/Neon) or DATABASE_URL / NUXT_DATABASE_URL (local).')
  }

  const migrationsDir = path.resolve(__dirname, '../server/db/migrations')
  const entries = await fs.readdir(migrationsDir)
  const migrations = entries.filter(name => name.endsWith('.sql')).sort()

  if (migrations.length === 0) {
    throw new Error('No migrations found under server/db/migrations')
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    await client.query(`
CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
`.trim())

    const appliedRes = await client.query('SELECT id FROM schema_migrations')
    const applied = new Set((appliedRes.rows || []).map(r => String(r.id)))

    for (const file of migrations) {
      if (applied.has(file)) {
        continue
      }

      const fullPath = path.join(migrationsDir, file)
      const sql = await fs.readFile(fullPath, 'utf8')

      if (!sql.trim()) {
        continue
      }

      // Note: migrations currently contain their own BEGIN/COMMIT.
      process.stdout.write(`[migrate] applying ${file}... `)

      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [file])

      process.stdout.write('ok\n')
    }

    process.stdout.write('[migrate] done\n')
  } finally {
    await client.end()
  }
}

run().catch((error) => {
  console.error('[migrate] failed')
  console.error(error)
  process.exitCode = 1
})
