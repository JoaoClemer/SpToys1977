import { asc, count, eq } from 'drizzle-orm'
import type { ProductListItem } from '../../shared/api'
import { getDb } from '../db/client'
import { products } from '../db/schema'

export const productRepository = {
  list(): ProductListItem[] {
    return getDb()
      .select({
        id: products.id,
        name: products.name,
        category: products.category,
        originalPrice: products.originalPrice,
        quantity: products.quantity
      })
      .from(products)
      .where(eq(products.archived, false))
      .orderBy(asc(products.name))
      .all()
  },

  count(): number {
    const [row] = getDb()
      .select({ n: count() })
      .from(products)
      .where(eq(products.archived, false))
      .all()
    return row?.n ?? 0
  }
}
