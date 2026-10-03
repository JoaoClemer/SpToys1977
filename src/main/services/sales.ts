import { and, asc, desc, eq, gte, isNotNull, isNull, lte, ne, sql, type SQL } from 'drizzle-orm'
import type { Customer, SaleListItem } from '../../shared/api'
import {
  markShippedSchema,
  saleFiltersSchema,
  saleInputSchema,
  saleUpdateSchema,
  type MarkShippedInput,
  type SaleFilters,
  type SaleInput,
  type SaleUpdate
} from '../../shared/schemas'
import { getDb, normalizeText } from '../db/client'
import { customers, products, sales, type Sale } from '../db/schema'
import { nowIso, toDateOnly } from './dates'

const saleColumns = {
  id: sales.id,
  productId: sales.productId,
  productName: products.name,
  productPhoto: sql<string | null>`(
    select pp.file_name from product_photos pp
    where pp.product_id = "sales"."product_id" order by pp.position limit 1)`,
  quantity: sales.quantity,
  unitPrice: sales.unitPrice,
  total: sql<number>`${sales.quantity} * ${sales.unitPrice}`,
  shippingCost: sales.shippingCost,
  soldAt: sales.soldAt,
  buyerName: sales.buyerName,
  buyerAddress: sales.buyerAddress,
  buyerPhone: sales.buyerPhone,
  deliveryMethod: sales.deliveryMethod,
  deliveryStatus: sales.deliveryStatus,
  trackingCode: sales.trackingCode,
  shippedAt: sales.shippedAt,
  deliveredAt: sales.deliveredAt,
  canceledAt: sales.canceledAt,
  notes: sales.notes
}

export function selectSales(
  where?: SQL,
  order: 'recent' | 'oldest' = 'recent',
  limit?: number
): SaleListItem[] {
  const q = getDb()
    .select(saleColumns)
    .from(sales)
    .innerJoin(products, eq(products.id, sales.productId))
    .where(where)
    .orderBy(
      ...(order === 'recent'
        ? [desc(sales.soldAt), desc(sales.id)]
        : [asc(sales.soldAt), asc(sales.id)])
    )
  return (limit ? q.limit(limit) : q).all()
}

function getRow(id: number): Sale {
  const row = getDb().select().from(sales).where(eq(sales.id, id)).get()
  if (!row) throw new Error('Venda não encontrada')
  return row
}

function assertActive(row: Sale): void {
  if (row.canceledAt) throw new Error('Esta venda foi cancelada')
}

function patch(id: number, values: Partial<Sale>): void {
  getDb()
    .update(sales)
    .set({ ...values, updatedAt: nowIso() })
    .where(eq(sales.id, id))
    .run()
}

/** Reaproveita o cliente escolhido ou um com mesmo nome/telefone; senão cria. */
function resolveCustomer(input: {
  customerId: number | null
  buyerName: string
  buyerPhone: string | null
  buyerAddress: string | null
}): number {
  const db = getDb()
  if (input.customerId) {
    const existing = db.select().from(customers).where(eq(customers.id, input.customerId)).get()
    if (existing) {
      db.update(customers)
        .set({
          name: input.buyerName,
          phone: input.buyerPhone ?? existing.phone,
          address: input.buyerAddress ?? existing.address,
          updatedAt: nowIso()
        })
        .where(eq(customers.id, existing.id))
        .run()
      return existing.id
    }
  }
  const match = db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(
        sql`norm(${customers.name}) = ${normalizeText(input.buyerName)}`,
        sql`coalesce(${customers.phone}, '') = ${input.buyerPhone ?? ''}`
      )
    )
    .get()
  if (match) {
    if (input.buyerAddress) {
      db.update(customers)
        .set({ address: input.buyerAddress, updatedAt: nowIso() })
        .where(eq(customers.id, match.id))
        .run()
    }
    return match.id
  }
  return db
    .insert(customers)
    .values({ name: input.buyerName, phone: input.buyerPhone, address: input.buyerAddress })
    .returning({ id: customers.id })
    .get().id
}

export const salesService = {
  list(raw?: SaleFilters): SaleListItem[] {
    const f = saleFiltersSchema.parse(raw)
    const where: SQL[] = []
    if (f.productId) where.push(eq(sales.productId, f.productId))
    if (f.search) {
      const q = `%${normalizeText(f.search)}%`
      where.push(
        sql`(norm(${sales.buyerName}) like ${q} or norm(${products.name}) like ${q} or norm(${sales.trackingCode}) like ${q} or norm(${sales.buyerPhone}) like ${q})`
      )
    }
    if (f.method !== 'all') where.push(eq(sales.deliveryMethod, f.method))
    if (f.status === 'canceled') where.push(isNotNull(sales.canceledAt))
    else if (f.status !== 'all') {
      where.push(isNull(sales.canceledAt))
      if (f.status === 'open') where.push(ne(sales.deliveryStatus, 'delivered'))
      else where.push(eq(sales.deliveryStatus, f.status))
    }
    if (f.from) where.push(gte(sales.soldAt, f.from))
    if (f.to) where.push(lte(sales.soldAt, f.to))
    return selectSales(where.length ? and(...where) : undefined)
  },

  get(id: number): SaleListItem {
    const [row] = selectSales(eq(sales.id, id))
    if (!row) throw new Error('Venda não encontrada')
    return row
  },

  create(raw: SaleInput): SaleListItem {
    const input = saleInputSchema.parse(raw)
    const soldAt = toDateOnly(input.soldAt)
    const id = getDb().transaction(() => {
      const db = getDb()
      const product = db.select().from(products).where(eq(products.id, input.productId)).get()
      if (!product) throw new Error('Produto não encontrado')
      if (input.quantity > product.quantity) {
        throw new Error(
          product.quantity === 0
            ? 'Este produto está esgotado'
            : `Estoque insuficiente: há apenas ${product.quantity} unidade(s)`
        )
      }
      const customerId = resolveCustomer(input)
      const deliveredNow = input.deliveryMethod === 'in_person' && input.deliveredNow
      const sale = db
        .insert(sales)
        .values({
          productId: product.id,
          customerId,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          soldAt,
          buyerName: input.buyerName,
          buyerAddress: input.buyerAddress,
          buyerPhone: input.buyerPhone,
          deliveryMethod: input.deliveryMethod,
          deliveryStatus: deliveredNow ? 'delivered' : 'pending',
          deliveredAt: deliveredNow ? soldAt : null,
          shippingCost: input.shippingCost,
          notes: input.notes
        })
        .returning({ id: sales.id })
        .get()
      db.update(products)
        .set({ quantity: sql`${products.quantity} - ${input.quantity}`, updatedAt: nowIso() })
        .where(eq(products.id, product.id))
        .run()
      return sale.id
    })
    return this.get(id)
  },

  update(id: number, raw: SaleUpdate): SaleListItem {
    const input = saleUpdateSchema.parse(raw)
    assertActive(getRow(id))
    patch(id, input)
    return this.get(id)
  },

  cancel(id: number): SaleListItem {
    getDb().transaction(() => {
      const row = getRow(id)
      assertActive(row)
      patch(id, { canceledAt: nowIso() })
      getDb()
        .update(products)
        .set({ quantity: sql`${products.quantity} + ${row.quantity}`, updatedAt: nowIso() })
        .where(eq(products.id, row.productId))
        .run()
    })
    return this.get(id)
  },

  markShipped(id: number, raw: MarkShippedInput): SaleListItem {
    const input = markShippedSchema.parse(raw)
    const row = getRow(id)
    assertActive(row)
    if (row.deliveryMethod !== 'mail') throw new Error('Apenas vendas pelos Correios são enviadas')
    if (row.deliveryStatus === 'delivered') throw new Error('Esta venda já foi entregue')
    patch(id, {
      deliveryStatus: 'shipped',
      trackingCode: input.trackingCode,
      shippedAt: toDateOnly(input.shippedAt)
    })
    return this.get(id)
  },

  markDelivered(id: number, deliveredAt: string): SaleListItem {
    const row = getRow(id)
    assertActive(row)
    patch(id, { deliveryStatus: 'delivered', deliveredAt: toDateOnly(deliveredAt) })
    return this.get(id)
  },

  /** Volta um passo no fluxo de entrega (desfazer) */
  reopenDelivery(id: number): SaleListItem {
    const row = getRow(id)
    assertActive(row)
    if (row.deliveryStatus === 'delivered') {
      patch(id, {
        deliveryStatus: row.deliveryMethod === 'mail' && row.shippedAt ? 'shipped' : 'pending',
        deliveredAt: null
      })
    } else if (row.deliveryStatus === 'shipped') {
      patch(id, { deliveryStatus: 'pending', shippedAt: null })
    }
    return this.get(id)
  }
}

export const customersService = {
  search(query: string): Customer[] {
    const q = `%${normalizeText(query.trim())}%`
    return getDb()
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        address: customers.address,
        purchases: sql<number>`(select count(*) from sales s where s.customer_id = "customers"."id" and s.canceled_at is null)`
      })
      .from(customers)
      .where(sql`norm(${customers.name}) like ${q} or norm(${customers.phone}) like ${q}`)
      .orderBy(asc(customers.name))
      .limit(8)
      .all()
  }
}
