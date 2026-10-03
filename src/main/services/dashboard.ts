import { and, asc, desc, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import type { DashboardSummary, MonthlyRevenue } from '../../shared/api'
import { getDb } from '../db/client'
import { products, sales } from '../db/schema'
import { monthKey, todayLocal } from './dates'
import { productListColumns } from './products'
import { selectSales } from './sales'

const active = isNull(sales.canceledAt)
const revenue = sql<number>`coalesce(sum(${sales.quantity} * ${sales.unitPrice}), 0)`

function periodTotals(prefix: string): {
  revenue: number
  sales: number
  units: number
  shipping: number
} {
  return getDb()
    .select({
      revenue,
      sales: sql<number>`count(*)`,
      units: sql<number>`coalesce(sum(${sales.quantity}), 0)`,
      shipping: sql<number>`coalesce(sum(${sales.shippingCost}), 0)`
    })
    .from(sales)
    .where(and(active, sql`substr(${sales.soldAt}, 1, ${prefix.length}) = ${prefix}`))
    .get()!
}

const STALE_DAYS = 60

export const dashboardService = {
  summary(now = new Date()): DashboardSummary {
    const db = getDb()

    const stock = db
      .select({
        products: sql<number>`coalesce(sum(case when ${products.quantity} > 0 then 1 else 0 end), 0)`,
        units: sql<number>`coalesce(sum(${products.quantity}), 0)`,
        value: sql<number>`coalesce(sum(${products.quantity} * ${products.originalPrice}), 0)`,
        soldOut: sql<number>`coalesce(sum(case when ${products.quantity} = 0 then 1 else 0 end), 0)`
      })
      .from(products)
      .where(eq(products.archived, false))
      .get()!

    const cur = periodTotals(monthKey(0, now))
    const prev = periodTotals(monthKey(-1, now))
    const year = periodTotals(String(now.getFullYear()))

    const pending = (
      method: 'mail' | 'in_person',
      status: 'pending' | 'shipped'
    ): ReturnType<typeof selectSales> =>
      selectSales(
        and(active, eq(sales.deliveryMethod, method), eq(sales.deliveryStatus, status)),
        'oldest'
      )

    const firstMonth = monthKey(-11, now)
    const byMonth = new Map(
      db
        .select({
          month: sql<string>`substr(${sales.soldAt}, 1, 7)`,
          revenue,
          sales: sql<number>`count(*)`
        })
        .from(sales)
        .where(and(active, sql`substr(${sales.soldAt}, 1, 7) >= ${firstMonth}`))
        .groupBy(sql`1`)
        .all()
        .map((r) => [r.month, r])
    )
    const monthly: MonthlyRevenue[] = Array.from({ length: 12 }, (_, i) => {
      const month = monthKey(i - 11, now)
      const r = byMonth.get(month)
      return { month, revenue: r?.revenue ?? 0, sales: r?.sales ?? 0 }
    })

    const topCategories = db
      .select({
        category: sql<string>`coalesce(${products.category}, 'Sem categoria')`,
        revenue,
        units: sql<number>`coalesce(sum(${sales.quantity}), 0)`
      })
      .from(sales)
      .innerJoin(products, eq(products.id, sales.productId))
      .where(active)
      .groupBy(sql`1`)
      .orderBy(desc(revenue))
      .limit(5)
      .all()

    const staleCutoff = todayLocal(new Date(now.getTime() - STALE_DAYS * 86_400_000))
    const staleProducts = db
      .select(productListColumns)
      .from(products)
      .where(
        and(
          eq(products.archived, false),
          gt(products.quantity, 0),
          lt(sql`substr(${products.createdAt}, 1, 10)`, staleCutoff),
          sql`not exists (select 1 from sales s where s.product_id = "products"."id"
                and s.canceled_at is null and s.sold_at >= ${staleCutoff})`
        )
      )
      .orderBy(asc(products.createdAt))
      .limit(5)
      .all()

    const recentProducts = db
      .select(productListColumns)
      .from(products)
      .where(eq(products.archived, false))
      .orderBy(desc(products.createdAt), desc(products.id))
      .limit(5)
      .all()

    return {
      stock,
      month: {
        ...cur,
        avgTicket: cur.sales ? Math.round(cur.revenue / cur.sales) : 0,
        prevRevenue: prev.revenue
      },
      year: { revenue: year.revenue, sales: year.sales },
      deliveries: {
        awaitingShipment: pending('mail', 'pending'),
        inTransit: pending('mail', 'shipped'),
        awaitingPickup: pending('in_person', 'pending')
      },
      recentSales: selectSales(active, 'recent', 6),
      monthly,
      topCategories,
      staleProducts,
      recentProducts
    }
  }
}
