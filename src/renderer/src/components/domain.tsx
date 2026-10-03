import { ImageOff, Package, Store, Truck } from 'lucide-react'
import type { SaleListItem } from '../../../shared/api'
import { DELIVERY_METHOD_LABEL, deliveryStatusLabel } from '../../../shared/schemas'
import { photoUrl } from '../lib/format'
import { cx } from '../lib/cx'
import { Badge } from './ui'

export function ProductThumb({
  file,
  size = 48,
  className
}: {
  file: string | null
  size?: number
  className?: string
}): React.JSX.Element {
  return (
    <div
      className={cx('shrink-0 overflow-hidden rounded-md bg-stone-100', className)}
      style={{ width: size, height: size }}
    >
      {file ? (
        <img src={photoUrl(file)} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-stone-300">
          <ImageOff size={Math.max(14, size / 3)} />
        </div>
      )}
    </div>
  )
}

export function DeliveryBadge({
  sale
}: {
  sale: Pick<SaleListItem, 'deliveryMethod' | 'deliveryStatus' | 'canceledAt'>
}): React.JSX.Element {
  if (sale.canceledAt) return <Badge tone="red">Cancelada</Badge>
  const label = deliveryStatusLabel(sale.deliveryMethod, sale.deliveryStatus)
  const tone =
    sale.deliveryStatus === 'delivered'
      ? 'green'
      : sale.deliveryStatus === 'shipped'
        ? 'blue'
        : 'amber'
  return <Badge tone={tone}>{label}</Badge>
}

export function MethodLabel({
  method
}: {
  method: SaleListItem['deliveryMethod']
}): React.JSX.Element {
  const Icon = method === 'mail' ? Truck : Store
  return (
    <span className="inline-flex items-center gap-1.5 text-stone-600">
      <Icon size={14} />
      {DELIVERY_METHOD_LABEL[method]}
    </span>
  )
}

export function StockBadge({
  quantity,
  archived
}: {
  quantity: number
  archived?: boolean
}): React.JSX.Element {
  if (archived) return <Badge>Arquivado</Badge>
  if (quantity === 0) return <Badge tone="red">Vendido</Badge>
  return (
    <Badge tone="green">
      <Package size={12} />
      {quantity} em estoque
    </Badge>
  )
}
