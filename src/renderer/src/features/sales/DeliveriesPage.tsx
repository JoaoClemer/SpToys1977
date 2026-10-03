import { Link } from 'react-router'
import { MapPin, PackageCheck, Store, Truck } from 'lucide-react'
import type { SaleListItem } from '../../../../shared/api'
import { PageHeader } from '../../components/PageHeader'
import { ProductThumb } from '../../components/domain'
import { Badge, EmptyState } from '../../components/ui'
import { cx } from '../../lib/cx'
import { daysAgoLabel, daysSince, formatDate, formatPhone } from '../../lib/format'
import { LATE_DAYS } from '../../lib/deliveries'
import { useIpcQuery } from '../../lib/ipc'
import { DeliveryActions } from './DeliveryActions'

export function DeliveriesPage(): React.JSX.Element {
  const { data } = useIpcQuery('dashboard:summary')
  const d = data?.deliveries

  return (
    <>
      <PageHeader
        title="Entregas"
        subtitle="Tudo que ainda não chegou ao comprador, do mais antigo para o mais novo"
      />
      {d && d.awaitingShipment.length + d.inTransit.length + d.awaitingPickup.length === 0 ? (
        <EmptyState icon={<PackageCheck size={40} />} title="Nenhuma entrega pendente">
          Todas as vendas já foram entregues.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-3 items-start gap-5">
          <Column
            icon={<Truck size={16} />}
            title="Aguardando envio"
            hint="Correios, ainda não postado"
            items={d?.awaitingShipment}
            since={(s) => s.soldAt}
            lateAfter={LATE_DAYS.ship}
          />
          <Column
            icon={<Truck size={16} />}
            title="Em trânsito"
            hint="Postado, aguardando entrega"
            items={d?.inTransit}
            since={(s) => s.shippedAt ?? s.soldAt}
            lateAfter={LATE_DAYS.transit}
          />
          <Column
            icon={<Store size={16} />}
            title="Aguardando retirada"
            hint="Presencial, ainda não entregue"
            items={d?.awaitingPickup}
            since={(s) => s.soldAt}
            lateAfter={LATE_DAYS.pickup}
          />
        </div>
      )}
    </>
  )
}

function Column({
  icon,
  title,
  hint,
  items = [],
  since,
  lateAfter
}: {
  icon: React.ReactNode
  title: string
  hint: string
  items?: SaleListItem[]
  since: (s: SaleListItem) => string
  lateAfter: number
}): React.JSX.Element {
  return (
    <section className="rounded-xl bg-stone-100 p-3">
      <header className="mb-3 flex items-center justify-between px-1">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-stone-800">
            {icon} {title}
          </h2>
          <p className="text-xs text-stone-500">{hint}</p>
        </div>
        <span className="tabular rounded-full bg-white px-2 py-0.5 text-sm font-semibold">
          {items.length}
        </span>
      </header>
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-stone-400">Nada aqui</p>
        )}
        {items.map((s) => {
          const late = daysSince(since(s)) > lateAfter
          return (
            <article
              key={s.id}
              className={cx(
                'rounded-lg border bg-white p-3',
                late ? 'border-amber-300' : 'border-stone-200'
              )}
            >
              <Link to={`/vendas/${s.id}`} className="flex gap-3">
                <ProductThumb file={s.productPhoto} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{s.productName}</div>
                  <div className="text-sm text-stone-600">{s.buyerName}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-500">
                    <span title={formatDate(since(s))}>{daysAgoLabel(since(s))}</span>
                    {late && <Badge tone="amber">Atrasado</Badge>}
                  </div>
                </div>
              </Link>
              {(s.buyerAddress || s.buyerPhone) &&
                s.deliveryMethod === 'mail' &&
                s.deliveryStatus === 'pending' && (
                  <div className="mt-2 flex gap-1.5 rounded bg-stone-50 p-2 text-xs text-stone-600">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    <span>
                      {s.buyerAddress ?? 'Sem endereço'}
                      {s.buyerPhone && <> · {formatPhone(s.buyerPhone)}</>}
                    </span>
                  </div>
                )}
              <div className="mt-3">
                <DeliveryActions sale={s} size="sm" />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
