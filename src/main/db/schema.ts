import { sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: text('created_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`)
}

export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    description: text('description'),
    category: text('category'),
    /** Preço original em centavos */
    originalPrice: integer('original_price').notNull(),
    /** Quantidade atual em estoque */
    quantity: integer('quantity').notNull().default(0),
    archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
    ...timestamps
  },
  (t) => [
    index('products_name_idx').on(t.name),
    check('products_quantity_non_negative', sql`${t.quantity} >= 0`),
    check('products_price_non_negative', sql`${t.originalPrice} >= 0`)
  ]
)

export const productPhotos = sqliteTable(
  'product_photos',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    /** 0 = foto principal */
    position: integer('position').notNull().default(0)
  },
  (t) => [index('product_photos_product_idx').on(t.productId, t.position)]
)

export const customers = sqliteTable(
  'customers',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    phone: text('phone'),
    address: text('address'),
    ...timestamps
  },
  (t) => [index('customers_name_idx').on(t.name)]
)

export const DELIVERY_METHODS = ['in_person', 'mail'] as const
export const DELIVERY_STATUSES = ['pending', 'shipped', 'delivered'] as const

export const sales = sqliteTable(
  'sales',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    customerId: integer('customer_id').references(() => customers.id),
    quantity: integer('quantity').notNull(),
    /** Preço unitário efetivamente praticado, em centavos */
    unitPrice: integer('unit_price').notNull(),
    soldAt: text('sold_at').notNull(),
    // Snapshot do comprador no momento da venda
    buyerName: text('buyer_name').notNull(),
    buyerAddress: text('buyer_address'),
    buyerPhone: text('buyer_phone'),
    deliveryMethod: text('delivery_method', { enum: DELIVERY_METHODS }).notNull(),
    deliveryStatus: text('delivery_status', { enum: DELIVERY_STATUSES })
      .notNull()
      .default('pending'),
    /** Frete em centavos (opcional) */
    shippingCost: integer('shipping_cost'),
    trackingCode: text('tracking_code'),
    shippedAt: text('shipped_at'),
    deliveredAt: text('delivered_at'),
    canceledAt: text('canceled_at'),
    notes: text('notes'),
    ...timestamps
  },
  (t) => [
    index('sales_product_idx').on(t.productId),
    index('sales_sold_at_idx').on(t.soldAt),
    index('sales_delivery_status_idx').on(t.deliveryStatus),
    check('sales_quantity_positive', sql`${t.quantity} > 0`),
    check('sales_delivery_method_valid', sql`${t.deliveryMethod} IN ('in_person','mail')`),
    check(
      'sales_delivery_status_valid',
      sql`${t.deliveryStatus} IN ('pending','shipped','delivered')`
    )
  ]
)

export type Product = typeof products.$inferSelect
export type ProductPhoto = typeof productPhotos.$inferSelect
export type Customer = typeof customers.$inferSelect
export type Sale = typeof sales.$inferSelect
