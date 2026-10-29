import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
const databaseUrl = proc?.env?.DATABASE_URL ?? ''

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
})
