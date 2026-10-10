import { and, asc, desc, eq, gt, sql, type SQL } from 'drizzle-orm'
import type { ProductDetail, ProductListItem, ProductPrivate } from '../../shared/api'
import {
  productFiltersSchema,
  productInputSchema,
  productPrivateSchema,
  type ProductFilters,
  type ProductInput,
  type ProductPrivateInput
} from '../../shared/schemas'
import { getDb, normalizeText } from '../db/client'
import { productPhotos, products, sales } from '../db/schema'
import { authService } from './auth'
import { nowIso } from './dates'
import { salesService } from './sales'

export const coverPhotoSql = sql<string | null>`(
  select pp.file_name from product_photos pp
  where pp.product_id = "products"."id" order by pp.position limit 1)`

export const productListColumns = {
  id: products.id,
  name: products.name,
  category: products.category,
  originalPrice: products.originalPrice,
  quantity: products.quantity,
  archived: products.archived,
  coverPhoto: coverPhotoSql,
  photoCount: sql<number>`(select count(*) from product_photos pp where pp.product_id = "products"."id")`,
  soldUnits: sql<number>`coalesce((
    select sum(s.quantity) from sales s
    where s.product_id = "products"."id" and s.canceled_at is null), 0)`,
  createdAt: products.createdAt
}

function photosOf(productId: number): string[] {
  return getDb()
    .select({ fileName: productPhotos.fileName })
    .from(productPhotos)
    .where(eq(productPhotos.productId, productId))
    .orderBy(asc(productPhotos.position))
    .all()
    .map((p) => p.fileName)
}

function replacePhotos(productId: number, files: string[]): void {
  const db = getDb()
  db.delete(productPhotos).where(eq(productPhotos.productId, productId)).run()
  if (files.length) {
    db.insert(productPhotos)
      .values(files.map((fileName, position) => ({ productId, fileName, position })))
      .run()
  }
}

export const productsService = {
  list(rawFilters?: ProductFilters): ProductListItem[] {
    const f = productFiltersSchema.parse(rawFilters)
    const where: SQL[] = [eq(products.archived, f.archived)]
    if (f.search) {
      const q = `%${normalizeText(f.search)}%`
      where.push(
        sql`(norm(${products.name}) like ${q} or norm(${products.description}) like ${q} or norm(${products.category}) like ${q})`
      )
    }
    if (f.category) where.push(eq(products.category, f.category))
    if (f.status === 'available') where.push(gt(products.quantity, 0))
    if (f.status === 'sold') where.push(eq(products.quantity, 0))

    return getDb()
      .select(productListColumns)
      .from(products)
      .where(and(...where))
      .orderBy(desc(products.createdAt), desc(products.id))
      .all()
  },

  get(id: number): ProductDetail {
    const p = getDb().select().from(products).where(eq(products.id, id)).get()
    if (!p) throw new Error('Produto não encontrado')
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      originalPrice: p.originalPrice,
      quantity: p.quantity,
      archived: p.archived,
      photos: photosOf(id),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      sales: salesService.list({ productId: id })
    }
  },

  create(raw: ProductInput): ProductDetail {
    const input = productInputSchema.parse(raw)
    const id = getDb().transaction(() => {
      const row = getDb()
        .insert(products)
        .values({
          name: input.name,
          description: input.description,
          category: input.category,
          originalPrice: input.originalPrice,
          quantity: input.quantity
        })
        .returning({ id: products.id })
        .get()
      replacePhotos(row.id, input.photos)
      return row.id
    })
    return this.get(id)
  },

  /** Retorna o produto atualizado e as fotos que deixaram de ser usadas */
  update(id: number, raw: ProductInput): { product: ProductDetail; removedPhotos: string[] } {
    const input = productInputSchema.parse(raw)
    const removedPhotos = getDb().transaction(() => {
      const before = photosOf(id)
      const res = getDb()
        .update(products)
        .set({
          name: input.name,
          description: input.description,
          category: input.category,
          originalPrice: input.originalPrice,
          quantity: input.quantity,
          updatedAt: nowIso()
        })
        .where(eq(products.id, id))
        .run()
      if (res.changes === 0) throw new Error('Produto não encontrado')
      replacePhotos(id, input.photos)
      return before.filter((f) => !input.photos.includes(f))
    })
    return { product: this.get(id), removedPhotos }
  },

  setArchived(id: number, archived: boolean): void {
    getDb().update(products).set({ archived, updatedAt: nowIso() }).where(eq(products.id, id)).run()
  },

  /** Exclui um produto sem vendas. Retorna as fotos a apagar do disco. */
  delete(id: number): string[] {
    return getDb().transaction(() => {
      const hasSales = getDb()
        .select({ id: sales.id })
        .from(sales)
        .where(eq(sales.productId, id))
        .limit(1)
        .get()
      if (hasSales)
        throw new Error('Este produto tem vendas registradas. Arquive-o em vez de excluir.')
      const photos = photosOf(id)
      getDb().delete(products).where(eq(products.id, id)).run()
      return photos
    })
  },

  categories(): string[] {
    return getDb()
      .selectDistinct({ category: products.category })
      .from(products)
      .where(sql`${products.category} is not null`)
      .orderBy(asc(products.category))
      .all()
      .map((r) => r.category!)
  },

  allPhotoFiles(): Set<string> {
    return new Set(
      getDb()
        .select({ f: productPhotos.fileName })
        .from(productPhotos)
        .all()
        .map((r) => r.f)
    )
  },

  /** Dados restritos: só com a senha de administrador desbloqueada */
  getPrivate(id: number): ProductPrivate {
    authService.assertUnlocked()
    const row = getDb()
      .select({
        purchasePrice: products.purchasePrice,
        negotiationLimit: products.negotiationLimit,
        privateNotes: products.privateNotes
      })
      .from(products)
      .where(eq(products.id, id))
      .get()
    if (!row) throw new Error('Produto não encontrado')
    return row
  },

  setPrivate(id: number, raw: ProductPrivateInput): ProductPrivate {
    authService.assertUnlocked()
    const input = productPrivateSchema.parse(raw)
    const res = getDb()
      .update(products)
      .set({ ...input, updatedAt: nowIso() })
      .where(eq(products.id, id))
      .run()
    if (res.changes === 0) throw new Error('Produto não encontrado')
    return this.getPrivate(id)
  }
}
