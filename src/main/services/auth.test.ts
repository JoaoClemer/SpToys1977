import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

vi.mock('electron', () => ({ app: {} }))

import { getDb, openDatabase, setDb } from '../db/client'
import { authService, UNLOCK_MS } from './auth'
import { productsService } from './products'
import { salesService } from './sales'
import { dashboardService } from './dashboard'

const MIGRATIONS = join(__dirname, '../../../drizzle')

beforeEach(() => {
  setDb(openDatabase(':memory:', MIGRATIONS))
  authService.lock()
})
afterEach(() => {
  vi.useRealTimers()
  getDb().$client.close()
  setDb(null)
})

const newProduct = (): number =>
  productsService.create({ name: 'Rádio Philips', originalPrice: 89000, quantity: 2, photos: [] })
    .id

describe('senha de administrador', () => {
  it('começa sem senha e bloqueado', () => {
    expect(authService.status()).toEqual({ hasPassword: false, unlocked: false, expiresAt: null })
  })

  it('não guarda a senha em texto', async () => {
    await authService.setPassword(null, 'segredo123')
    const rows = getDb().$client.prepare('select value from settings').all() as { value: string }[]
    expect(rows[0].value).toMatch(/^scrypt\$/)
    expect(rows[0].value).not.toContain('segredo123')
  })

  it('exige tamanho mínimo', async () => {
    await expect(authService.setPassword(null, '12')).rejects.toThrow(/pelo menos 4/)
  })

  it('desbloqueia só com a senha certa', async () => {
    await authService.setPassword(null, 'segredo123')
    await expect(authService.unlock('errada')).rejects.toThrow('Senha incorreta')
    expect(authService.status().unlocked).toBe(false)
    const st = await authService.unlock('segredo123')
    expect(st.unlocked).toBe(true)
    expect(authService.lock().unlocked).toBe(false)
  })

  it('alterar exige a senha atual', async () => {
    await authService.setPassword(null, 'primeira')
    await expect(authService.setPassword(null, 'outra1')).rejects.toThrow('Senha atual incorreta')
    await expect(authService.setPassword('errada', 'outra1')).rejects.toThrow(
      'Senha atual incorreta'
    )
    await authService.setPassword('primeira', 'segunda')
    await expect(authService.unlock('primeira')).rejects.toThrow()
    expect((await authService.unlock('segunda')).unlocked).toBe(true)
  })

  it('o desbloqueio expira sozinho', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    await authService.setPassword(null, 'segredo123')
    await authService.unlock('segredo123')
    vi.setSystemTime(Date.now() + UNLOCK_MS + 1)
    expect(authService.status().unlocked).toBe(false)
    expect(() => productsService.getPrivate(newProduct())).toThrow(/bloqueados/)
  })
})

describe('dados restritos do produto', () => {
  it('não podem ser lidos nem gravados bloqueado', () => {
    const id = newProduct()
    expect(() => productsService.getPrivate(id)).toThrow(/bloqueados/)
    expect(() => productsService.setPrivate(id, { purchasePrice: 1 })).toThrow(/bloqueados/)
  })

  it('grava e lê com a senha desbloqueada', async () => {
    const id = newProduct()
    await authService.setPassword(null, 'segredo123')
    await authService.unlock('segredo123')
    expect(productsService.getPrivate(id)).toEqual({
      purchasePrice: null,
      negotiationLimit: null,
      privateNotes: null
    })
    productsService.setPrivate(id, {
      purchasePrice: 30000,
      negotiationLimit: 75000,
      privateNotes: '  Comprado na feira  '
    })
    expect(productsService.getPrivate(id)).toEqual({
      purchasePrice: 30000,
      negotiationLimit: 75000,
      privateNotes: 'Comprado na feira'
    })
  })

  it('nunca aparecem nas consultas comuns (produto, lista, vendas, painel)', async () => {
    const id = newProduct()
    await authService.setPassword(null, 'segredo123')
    await authService.unlock('segredo123')
    productsService.setPrivate(id, {
      purchasePrice: 30000,
      negotiationLimit: 75000,
      privateNotes: 'x'
    })
    salesService.create({
      productId: id,
      quantity: 1,
      unitPrice: 80000,
      soldAt: '2026-10-01',
      buyerName: 'Maria',
      deliveryMethod: 'in_person'
    })
    const leaks = JSON.stringify([
      productsService.get(id),
      productsService.list({ status: 'all' }),
      salesService.list(),
      dashboardService.summary()
    ])
    expect(leaks).not.toMatch(/purchasePrice|negotiationLimit|privateNotes|30000|75000/)
  })

  it('editar o produto pelo formulário comum preserva os dados restritos', async () => {
    const id = newProduct()
    await authService.setPassword(null, 'segredo123')
    await authService.unlock('segredo123')
    productsService.setPrivate(id, {
      purchasePrice: 30000,
      negotiationLimit: 75000,
      privateNotes: 'x'
    })
    authService.lock()
    productsService.update(id, {
      name: 'Rádio Philips 1958',
      originalPrice: 90000,
      quantity: 1,
      photos: []
    })
    await authService.unlock('segredo123')
    expect(productsService.getPrivate(id).purchasePrice).toBe(30000)
  })
})

describe('atualização de um banco já em uso', () => {
  it('migra a versão 1.0 sem perder produtos, vendas e fotos', () => {
    // Monta um banco só com a migration da v1.0, como o que já está em uso
    const dir = mkdtempSync(join(tmpdir(), 'sptoys-upgrade-'))
    const oldMigrations = join(dir, 'drizzle')
    mkdirSync(join(oldMigrations, 'meta'), { recursive: true })
    copyFileSync(join(MIGRATIONS, '0000_init.sql'), join(oldMigrations, '0000_init.sql'))
    const journal = JSON.parse(readFileSync(join(MIGRATIONS, 'meta/_journal.json'), 'utf8'))
    journal.entries = journal.entries.filter((e: { idx: number }) => e.idx === 0)
    writeFileSync(join(oldMigrations, 'meta/_journal.json'), JSON.stringify(journal))
    const file = join(dir, 'sptoys.db')

    try {
      setDb(openDatabase(file, oldMigrations))
      const old = getDb().$client
      expect(() => old.prepare('select purchase_price from products').all()).toThrow()
      old.exec(`
        insert into products (name, original_price, quantity) values ('Boneca Susi', 32000, 1);
        insert into product_photos (product_id, file_name, position) values (1, 'a.jpg', 0);
        insert into customers (name) values ('Ana');
        insert into sales (product_id, customer_id, quantity, unit_price, sold_at, buyer_name, delivery_method, delivery_status)
          values (1, 1, 1, 30000, '2026-09-30', 'Ana', 'mail', 'pending');
      `)
      old.close()

      // Abre com todas as migrations, como a v1.1 fará ao iniciar
      setDb(openDatabase(file, MIGRATIONS))
      const p = productsService.get(1)
      expect(p).toMatchObject({ name: 'Boneca Susi', originalPrice: 32000, photos: ['a.jpg'] })
      expect(p.sales).toHaveLength(1)
      expect(salesService.get(1)).toMatchObject({ buyerName: 'Ana', deliveryStatus: 'pending' })
      expect(authService.status().hasPassword).toBe(false)
    } finally {
      getDb().$client.close()
      rmSync(dir, { recursive: true, force: true })
    }
    setDb(openDatabase(':memory:', MIGRATIONS)) // para o afterEach
  })
})
