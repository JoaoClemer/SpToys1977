import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'

export type DB = BetterSQLite3Database<typeof schema> & { $client: Database.Database }

let db: DB | null = null

export function getDataPath(): string {
  return app.getPath('userData')
}

export function getDbPath(): string {
  return join(getDataPath(), 'sptoys.db')
}

function getMigrationsFolder(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'migrations')
    : join(app.getAppPath(), 'drizzle')
}

/** Remove acentos e caixa: usado para busca ("maquina" encontra "Máquina") */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function openDatabase(file: string, migrationsFolder: string): DB {
  const sqlite = new Database(file)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  sqlite.function('norm', { deterministic: true }, (s: unknown) =>
    s == null ? null : normalizeText(String(s))
  )
  const instance = drizzle(sqlite, { schema })
  migrate(instance, { migrationsFolder })
  return instance
}

export function initDb(): DB {
  if (!db) db = openDatabase(getDbPath(), getMigrationsFolder())
  return db
}

export function getDb(): DB {
  if (!db) throw new Error('Banco de dados não inicializado')
  return db
}

/** Usado pelos testes para injetar um banco em memória */
export function setDb(instance: DB | null): void {
  db = instance
}

export function closeDb(): void {
  db?.$client.close()
  db = null
}
