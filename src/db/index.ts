import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'
import { env } from '../lib/env'

type Db = ReturnType<typeof createDb>

function createDb() {
  const url = env.DATABASE_URL
  if (!url) throw new Error('Falta la variable DATABASE_URL')
  return drizzle(neon(url), { schema })
}

let instance: Db | undefined

/** Conexión perezosa: se crea en la primera consulta, no al importar el módulo. */
export function getDb(): Db {
  instance ??= createDb()
  return instance
}

export { schema }
