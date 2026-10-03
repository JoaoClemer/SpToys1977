import { z } from 'zod'

const optionalText = z
  .string()
  .trim()
  .transform((s) => (s === '' ? null : s))
  .nullable()
  .optional()
  .transform((v) => v ?? null)

const cents = z.number().int().min(0)
const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Data inválida')

export const productInputSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome'),
  description: optionalText,
  category: optionalText,
  originalPrice: cents,
  quantity: z.number().int().min(0, 'Quantidade não pode ser negativa'),
  /** Nomes dos arquivos de foto, na ordem; a primeira é a principal */
  photos: z.array(z.string().regex(/^[\w-]+\.jpg$/)).default([])
})
export type ProductInput = z.input<typeof productInputSchema>

export const productFiltersSchema = z
  .object({
    search: z.string().trim().optional(),
    category: z.string().optional(),
    status: z.enum(['all', 'available', 'sold']).default('all'),
    archived: z.boolean().default(false)
  })
  .default({ status: 'all', archived: false })
export type ProductFilters = z.input<typeof productFiltersSchema>

export const DELIVERY_METHOD_LABEL = { in_person: 'Presencial', mail: 'Correios' } as const
export type DeliveryMethod = keyof typeof DELIVERY_METHOD_LABEL
export type DeliveryStatus = 'pending' | 'shipped' | 'delivered'

export function deliveryStatusLabel(method: DeliveryMethod, status: DeliveryStatus): string {
  if (status === 'delivered') return 'Entregue'
  if (status === 'shipped') return 'Enviado'
  return method === 'mail' ? 'Aguardando envio' : 'Aguardando retirada'
}

export const saleInputSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive('Quantidade deve ser maior que zero'),
  unitPrice: cents,
  soldAt: isoDate,
  customerId: z.number().int().positive().nullable().default(null),
  buyerName: z.string().trim().min(1, 'Informe o nome do comprador'),
  buyerAddress: optionalText,
  buyerPhone: optionalText,
  deliveryMethod: z.enum(['in_person', 'mail']),
  shippingCost: cents.nullable().default(null),
  /** Presencial: já entregue no ato da venda */
  deliveredNow: z.boolean().default(false),
  notes: optionalText
})
export type SaleInput = z.input<typeof saleInputSchema>

export const saleUpdateSchema = z.object({
  unitPrice: cents,
  buyerName: z.string().trim().min(1, 'Informe o nome do comprador'),
  buyerAddress: optionalText,
  buyerPhone: optionalText,
  shippingCost: cents.nullable().default(null),
  trackingCode: optionalText,
  notes: optionalText
})
export type SaleUpdate = z.input<typeof saleUpdateSchema>

export const saleFiltersSchema = z
  .object({
    search: z.string().trim().optional(),
    method: z.enum(['all', 'in_person', 'mail']).default('all'),
    status: z.enum(['all', 'pending', 'shipped', 'delivered', 'open', 'canceled']).default('all'),
    from: z.string().optional(),
    to: z.string().optional(),
    productId: z.number().int().positive().optional()
  })
  .default({ method: 'all', status: 'all' })
export type SaleFilters = z.input<typeof saleFiltersSchema>

export const markShippedSchema = z.object({
  trackingCode: optionalText,
  shippedAt: isoDate
})
export type MarkShippedInput = z.input<typeof markShippedSchema>
