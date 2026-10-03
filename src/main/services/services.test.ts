import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { join } from 'path'

vi.mock('electron', () => ({ app: {} }))

import { openDatabase, setDb, getDb } from '../db/client'
import { productsService } from './products'
import { customersService, salesService } from './sales'
import { dashboardService } from './dashboard'
import { products } from '../db/schema'
import { eq } from 'drizzle-orm'

const MIGRATIONS = join(__dirname, '../../../drizzle')

function newProduct(over: Partial<Parameters<typeof productsService.create>[0]> = {}): number {
  return productsService.create({
    name: 'Carrinho de ferro',
    originalPrice: 45000,
    quantity: 2,
    photos: ['a.jpg', 'b.jpg'],
    ...over
  }).id
}

function sell(
  productId: number,
  over: Partial<Parameters<typeof salesService.create>[0]> = {}
): ReturnType<typeof salesService.create> {
  return salesService.create({
    productId,
    quantity: 1,
    unitPrice: 40000,
    soldAt: '2026-09-10',
    buyerName: 'Maria Silva',
    deliveryMethod: 'mail',
    ...over
  })
}

const stockOf = (id: number): number =>
  getDb().select().from(products).where(eq(products.id, id)).get()!.quantity

beforeEach(() => setDb(openDatabase(':memory:', MIGRATIONS)))
afterEach(() => {
  getDb().$client.close()
  setDb(null)
})

describe('produtos', () => {
  it('cria com fotos ordenadas e busca sem acento', () => {
    const id = newProduct({ name: 'Máquina de escrever', category: 'Escritório' })
    expect(productsService.get(id).photos).toEqual(['a.jpg', 'b.jpg'])
    const [item] = productsService.list({ search: 'maquina' })
    expect(item.id).toBe(id)
    expect(item.coverPhoto).toBe('a.jpg')
    expect(productsService.categories()).toEqual(['Escritório'])
  })

  it('capa, contagem de fotos e unidades vendidas por produto (subconsultas)', () => {
    newProduct({ photos: [] })
    const b = newProduct({ photos: ['x.jpg', 'y.jpg', 'z.jpg'], quantity: 5 })
    sell(b, { quantity: 2 })
    const item = productsService.list().find((p) => p.id === b)!
    expect(item).toMatchObject({ coverPhoto: 'x.jpg', photoCount: 3, soldUnits: 2 })
    expect(salesService.list()[0].productPhoto).toBe('x.jpg')
  })

  it('update devolve as fotos removidas', () => {
    const id = newProduct()
    const { removedPhotos, product } = productsService.update(id, {
      name: 'Novo nome',
      originalPrice: 100,
      quantity: 1,
      photos: ['b.jpg', 'c.jpg']
    })
    expect(removedPhotos).toEqual(['a.jpg'])
    expect(product.photos).toEqual(['b.jpg', 'c.jpg'])
  })

  it('não exclui produto com vendas', () => {
    const id = newProduct()
    sell(id)
    expect(() => productsService.delete(id)).toThrow(/Arquive/)
  })

  it('filtra por disponível / vendido', () => {
    const a = newProduct({ quantity: 1 })
    const b = newProduct({ quantity: 0 })
    expect(productsService.list({ status: 'available' }).map((p) => p.id)).toEqual([a])
    expect(productsService.list({ status: 'sold' }).map((p) => p.id)).toEqual([b])
  })
})

describe('vendas', () => {
  it('dá baixa no estoque e bloqueia venda acima do disponível', () => {
    const id = newProduct({ quantity: 2 })
    sell(id, { quantity: 2 })
    expect(stockOf(id)).toBe(0)
    expect(() => sell(id)).toThrow(/esgotado/)
  })

  it('mensagem de estoque insuficiente', () => {
    const id = newProduct({ quantity: 1 })
    expect(() => sell(id, { quantity: 3 })).toThrow(/apenas 1/)
    expect(stockOf(id)).toBe(1)
  })

  it('cancelar devolve ao estoque e não pode cancelar duas vezes', () => {
    const id = newProduct({ quantity: 1 })
    const sale = sell(id)
    expect(stockOf(id)).toBe(0)
    salesService.cancel(sale.id)
    expect(stockOf(id)).toBe(1)
    expect(() => salesService.cancel(sale.id)).toThrow(/cancelada/)
  })

  it('presencial entregue no ato', () => {
    const sale = sell(newProduct(), { deliveryMethod: 'in_person', deliveredNow: true })
    expect(sale.deliveryStatus).toBe('delivered')
    expect(sale.deliveredAt).toBe('2026-09-10')
  })

  it('fluxo Correios: pendente → enviado → entregue, e desfazer', () => {
    const sale = sell(newProduct(), { shippingCost: 2500 })
    expect(sale.deliveryStatus).toBe('pending')
    const shipped = salesService.markShipped(sale.id, {
      trackingCode: 'AA123456789BR',
      shippedAt: '2026-09-11'
    })
    expect(shipped).toMatchObject({ deliveryStatus: 'shipped', trackingCode: 'AA123456789BR' })
    const delivered = salesService.markDelivered(sale.id, '2026-09-15')
    expect(delivered.deliveryStatus).toBe('delivered')
    expect(salesService.reopenDelivery(sale.id).deliveryStatus).toBe('shipped')
    expect(salesService.reopenDelivery(sale.id).deliveryStatus).toBe('pending')
  })

  it('presencial não pode ser marcado como enviado', () => {
    const sale = sell(newProduct(), { deliveryMethod: 'in_person' })
    expect(() => salesService.markShipped(sale.id, { shippedAt: '2026-09-11' })).toThrow()
  })

  it('reaproveita cliente pelo nome/telefone e endereço é opcional', () => {
    const id = newProduct({ quantity: 5 })
    sell(id, { buyerName: 'João Souza', buyerPhone: '11999990000' })
    sell(id, { buyerName: 'joao souza', buyerPhone: '11999990000', buyerAddress: 'Rua A, 10' })
    const found = customersService.search('joão')
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ purchases: 2, address: 'Rua A, 10' })
  })

  it('filtros de status', () => {
    const id = newProduct({ quantity: 5 })
    const a = sell(id)
    const b = sell(id, { deliveryMethod: 'in_person', deliveredNow: true })
    const c = sell(id)
    salesService.cancel(c.id)
    expect(salesService.list({ status: 'open' }).map((s) => s.id)).toEqual([a.id])
    expect(salesService.list({ status: 'delivered' }).map((s) => s.id)).toEqual([b.id])
    expect(salesService.list({ status: 'canceled' }).map((s) => s.id)).toEqual([c.id])
  })
})

describe('painel', () => {
  it('resume estoque, mês e pendências', () => {
    const now = new Date(2026, 8, 20)
    const a = newProduct({ quantity: 3, originalPrice: 10000, category: 'Brinquedos' })
    sell(a, { unitPrice: 9000, soldAt: '2026-09-05', shippingCost: 1500 })
    sell(a, { unitPrice: 11000, soldAt: '2026-08-05', deliveryMethod: 'in_person' })
    const s = dashboardService.summary(now)
    expect(s.stock).toMatchObject({ products: 1, units: 1, value: 10000, soldOut: 0 })
    expect(s.month).toMatchObject({ revenue: 9000, sales: 1, shipping: 1500, prevRevenue: 11000 })
    expect(s.deliveries.awaitingShipment).toHaveLength(1)
    expect(s.deliveries.awaitingPickup).toHaveLength(1)
    expect(s.monthly).toHaveLength(12)
    expect(s.monthly.at(-1)).toMatchObject({ month: '2026-09', revenue: 9000 })
    expect(s.topCategories[0]).toMatchObject({ category: 'Brinquedos', revenue: 20000 })
  })
})
