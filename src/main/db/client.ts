import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

export type DB = BetterSQLite3Database<typeof schema>

let sqlite: Database.Database | null = null
let db: DB | null = null

export function getDbPath(): string {
  return join(app.getPath('userData'), 'sptoys.db')
}

function getMigrationsFolder(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'migrations')
    : join(app.getAppPath(), 'drizzle')
}

export function initDb(): DB {
  if (db) return db
  sqlite = new Database(getDbPath())
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: getMigrationsFolder() })
  return db
}

export function getDb(): DB {
  if (!db) throw new Error('Banco de dados não inicializado')
  return db
}

export function closeDb(): void {
  sqlite?.close()
  sqlite = null
  db = null
}
