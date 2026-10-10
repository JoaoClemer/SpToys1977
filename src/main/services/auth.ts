import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { eq } from 'drizzle-orm'
import type { AdminStatus } from '../../shared/api'
import { ADMIN_UNLOCK_MINUTES, adminPasswordSchema } from '../../shared/schemas'
import { getDb } from '../db/client'
import { settings } from '../db/schema'
import { nowIso } from './dates'

const PASSWORD_KEY = 'admin_password'
export const UNLOCK_MS = ADMIN_UNLOCK_MINUTES * 60_000
/** Atraso após senha errada, para dificultar tentativas em série */
const WRONG_PASSWORD_DELAY_MS = 800

// Estado do desbloqueio vive só na memória do processo principal: fechar o app bloqueia.
let unlockedUntil = 0

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize('NFC'), salt, 64, (err, key) => (err ? reject(err) : resolve(key)))
  )
}

/** Formato: scrypt$<salt base64>$<hash base64> */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt)
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hash] = stored.split('$')
  if (algo !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64'))
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function storedHash(): string | null {
  return (
    getDb()
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, PASSWORD_KEY))
      .get()?.value ?? null
  )
}

async function rejectWrongPassword(message: string): Promise<never> {
  await new Promise((r) => setTimeout(r, WRONG_PASSWORD_DELAY_MS))
  throw new Error(message)
}

export const authService = {
  status(): AdminStatus {
    const unlocked = unlockedUntil > Date.now()
    return {
      hasPassword: storedHash() !== null,
      unlocked,
      expiresAt: unlocked ? unlockedUntil : null
    }
  },

  /** Cria a senha (sem senha atual) ou altera (exige a atual). Bloqueia em seguida. */
  async setPassword(current: string | null, next: string): Promise<AdminStatus> {
    const nextPassword = adminPasswordSchema.parse(next)
    const stored = storedHash()
    if (stored && !(current && (await verifyPassword(current, stored)))) {
      return rejectWrongPassword('Senha atual incorreta')
    }
    const value = await hashPassword(nextPassword)
    getDb()
      .insert(settings)
      .values({ key: PASSWORD_KEY, value })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: nowIso() } })
      .run()
    unlockedUntil = 0
    return this.status()
  },

  async unlock(password: string): Promise<AdminStatus> {
    const stored = storedHash()
    if (!stored) throw new Error('Nenhuma senha cadastrada. Cadastre em Configurações.')
    if (!(await verifyPassword(password, stored))) return rejectWrongPassword('Senha incorreta')
    unlockedUntil = Date.now() + UNLOCK_MS
    return this.status()
  },

  lock(): AdminStatus {
    unlockedUntil = 0
    return this.status()
  },

  assertUnlocked(): void {
    if (unlockedUntil <= Date.now()) {
      throw new Error('Dados restritos bloqueados. Digite a senha de administrador para continuar.')
    }
  }
}
