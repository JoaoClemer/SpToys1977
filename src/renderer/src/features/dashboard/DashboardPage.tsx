import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Coins,
  Package,
  Plus,
  Receipt,
  Store,
  Truck
} from 'lucide-react'
import type { DashboardSummary, SaleListItem } from '../../../../shared/api'
import { DeliveryBadge, ProductThumb } from '../../components/domain'
import { Badge, Button, Card } from '../../components/ui'
import { cx } from '../../lib/cx'
import { daysAgoLabel, daysSince, formatCents, formatDate, monthLong } from '../../lib/format'
import { useIpcQuery } from '../../lib/ipc'
import { ProductFormModal } from '../products/ProductFormModal'
import { LATE_DAYS } from '../../lib/deliveries'
import { RevenueChart, RevenueTable } from './RevenueChart'

export function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { data, error } = useIpcQuery('dashboard:summary')
  const [creating, setCreating] = useState(false)
  const [showTable, setShowTable] = useState(false)

  if (error) return <p className="text-red-600">Erro: {error.message}</p>
  if (!data) return <></>

  const month = data.monthly.at(-1)!.month
  const d = data.deliveries
  const pendingTotal = d.awaitingShipment.length + d.inTransit.length + d.awaitingPickup.length
  const lateShipments = d.awaitingShipment.filter(
    (s) => daysSince(s.soldAt) > LATE_DAYS.ship
  ).length

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{greeting()}</h1>
          <p className="mt-1 text-sm text-stone-500">Resumo de {monthLong(month)}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/entregas')}>
            <Truck size={16} /> Entregas
          </Button>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Novo produto
          </Button>
        </div>
      </header>

      {lateShipments > 0 && (
        <Link
          to="/entregas"
          className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100"
        >
          <Clock size={18} />
          <span className="flex-1">
            <strong>{lateShipments}</strong> venda(s) pelos Correios aguardando envio há mais de{' '}
            {LATE_DAYS.ship} dias.
          </span>
          <ArrowRight size={16} />
        </Link>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Kpi
          icon={<Coins size={16} />}
          label="Faturamento do mês"
          value={formatCents(data.month.revenue)}
          foot={<Delta current={data.month.revenue} previous={data.month.prevRevenue} />}
        />
        <Kpi
          icon={<Receipt size={16} />}
          label="Vendas no mês"
          value={String(data.month.sales)}
          foot={
            <>
              {data.month.units} un. · ticket médio {formatCents(data.month.avgTicket)}
            </>
          }
        />
        <Kpi
          icon={<Package size={16} />}
          label="Valor em estoque"
          value={formatCents(data.stock.value)}
          foot={
            <>
              {data.stock.units} un. em {data.stock.products} produto(s)
            </>
          }
        />
        <Kpi
          icon={<Truck size={16} />}
          label="Entregas pendentes"
          value={String(pendingTotal)}
          foot={
            <>
              {d.awaitingShipment.length} a enviar · {d.inTransit.length} em trânsito ·{' '}
              {d.awaitingPickup.length} a retirar
            </>
          }
          highlight={pendingTotal > 0}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Faturamento */}
        <Card
          className="col-span-2"
          title="Faturamento: últimos 12 meses"
          action={
            <div className="flex items-center gap-3 text-xs text-stone-500">
              <span className="tabular">
                {new Date().getFullYear()}:{' '}
                <strong className="text-stone-800">{formatCents(data.year.revenue)}</strong> em{' '}
                {data.year.sales} venda(s)
              </span>
              <button
                type="button"
                onClick={() => setShowTable((v) => !v)}
                className="text-brand-700 hover:underline"
              >
                {showTable ? 'Ver gráfico' : 'Ver tabela'}
              </button>
            </div>
          }
        >
          {showTable ? <RevenueTable data={data.monthly} /> : <RevenueChart data={data.monthly} />}
        </Card>

        {/* Pendências */}
        <Card
          title="Pendências de entrega"
          action={
            <Link to="/entregas" className="text-xs text-brand-700 hover:underline">
              Ver todas
            </Link>
          }
          padded={false}
        >
          <PendingGroup
            icon={<Truck size={14} />}
            title="A enviar (Correios)"
            items={d.awaitingShipment}
            late={LATE_DAYS.ship}
            since={(s) => s.soldAt}
          />
          <PendingGroup
            icon={<Truck size={14} />}
            title="Em trânsito"
            items={d.inTransit}
            late={LATE_DAYS.transit}
            since={(s) => s.shippedAt ?? s.soldAt}
          />
          <PendingGroup
            icon={<Store size={14} />}
            title="A retirar (presencial)"
            items={d.awaitingPickup}
            late={LATE_DAYS.pickup}
            since={(s) => s.soldAt}
          />
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Últimas vendas */}
        <Card
          className="col-span-2"
          title="Últimas vendas"
          action={
            <Link to="/vendas" className="text-xs text-brand-700 hover:underline">
              Ver todas
            </Link>
          }
          padded={false}
        >
          {data.recentSales.length === 0 ? (
            <p className="p-5 text-sm text-stone-400">Nenhuma venda registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {data.recentSales.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/vendas/${s.id}`}
                    className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-stone-50"
                  >
                    <ProductThumb file={s.productPhoto} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{s.productName}</div>
                      <div className="text-xs text-stone-500">
                        {s.buyerName} · {formatDate(s.soldAt)}
                      </div>
                    </div>
                    <span className="tabular font-medium">{formatCents(s.total)}</span>
                    <DeliveryBadge sale={s} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Categorias */}
        <Card title="Categorias que mais vendem">
          <CategoryBars data={data.topCategories} />
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card
          className="col-span-2"
          title="Adicionados recentemente"
          action={
            <Link to="/estoque" className="text-xs text-brand-700 hover:underline">
              Ver estoque
            </Link>
          }
        >
          {data.recentProducts.length === 0 ? (
            <p className="text-sm text-stone-400">Nenhum produto cadastrado ainda.</p>
          ) : (
            <div className="grid grid-cols-5 gap-3">
              {data.recentProducts.map((p) => (
                <Link key={p.id} to={`/estoque/${p.id}`} className="group">
                  <ProductThumb
                    file={p.coverPhoto}
                    size={120}
                    className={cx(
                      '!h-auto !w-full aspect-square',
                      p.quantity === 0 && 'opacity-60 grayscale'
                    )}
                  />
                  <div className="mt-1.5 line-clamp-1 text-xs font-medium group-hover:text-brand-700">
                    {p.name}
                  </div>
                  <div className="tabular text-xs text-stone-500">
                    {formatCents(p.originalPrice)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <StaleCard items={data.staleProducts} />
      </div>

      <ProductFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function Kpi({
  icon,
  label,
  value,
  foot,
  highlight
}: {
  icon: React.ReactNode
  label: string
  value: string
  foot: React.ReactNode
  highlight?: boolean
}): React.JSX.Element {
  return (
    <div
      className={cx(
        'rounded-xl border bg-white p-5',
        highlight ? 'border-amber-300' : 'border-stone-200'
      )}
    >
      <div className="flex items-center gap-1.5 text-sm text-stone-500">
        {icon} {label}
      </div>
      <div className="tabular mt-2 text-2xl font-semibold text-stone-900">{value}</div>
      <div className="mt-1 text-xs text-stone-500">{foot}</div>
    </div>
  )
}

function Delta({ current, previous }: { current: number; previous: number }): React.JSX.Element {
  if (previous === 0) return <>Sem vendas no mês anterior</>
  const pct = Math.round(((current - previous) / previous) * 100)
  const up = pct >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={cx(
          'inline-flex items-center font-medium',
          up ? 'text-emerald-700' : 'text-red-600'
        )}
      >
        <Icon size={14} />
        {up ? '+' : ''}
        {pct}%
      </span>
      vs. mês anterior ({formatCents(previous)})
    </span>
  )
}

function PendingGroup({
  icon,
  title,
  items,
  late,
  since
}: {
  icon: React.ReactNode
  title: string
  items: SaleListItem[]
  late: number
  since: (s: SaleListItem) => string
}): React.JSX.Element {
  const shown = items.slice(0, 3)
  return (
    <div className="border-b border-stone-100 px-5 py-3 last:border-0">
      <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-stone-500">
        <span className="flex items-center gap-1.5">
          {icon} {title}
        </span>
        <span className="tabular rounded-full bg-stone-100 px-2 text-stone-700">
          {items.length}
        </span>
      </div>
      {shown.length === 0 ? (
        <p className="text-xs text-stone-400">Nada pendente</p>
      ) : (
        <ul className="space-y-1">
          {shown.map((s) => (
            <li key={s.id}>
              <Link
                to={`/vendas/${s.id}`}
                className="flex items-center justify-between gap-2 text-sm hover:text-brand-700"
              >
                <span className="truncate">{s.buyerName}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-stone-500">
                  {daysSince(since(s)) > late && <Badge tone="amber">Atrasado</Badge>}
                  {daysAgoLabel(since(s))}
                </span>
              </Link>
            </li>
          ))}
          {items.length > shown.length && (
            <li className="text-xs text-stone-400">+ {items.length - shown.length} outra(s)</li>
          )}
        </ul>
      )}
    </div>
  )
}

function CategoryBars({ data }: { data: DashboardSummary['topCategories'] }): React.JSX.Element {
  if (data.length === 0)
    return (
      <p className="text-sm text-stone-400">As categorias aparecem após as primeiras vendas.</p>
    )
  const max = Math.max(...data.map((c) => c.revenue), 1)
  return (
    <ul className="space-y-3">
      {data.map((c) => (
        <li key={c.category} title={`${c.units} unidade(s) vendidas`}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="truncate">{c.category}</span>
            <span className="tabular text-stone-600">{formatCents(c.revenue)}</span>
          </div>
          <div className="h-2 rounded-full bg-stone-100">
            <div
              className="h-2 rounded-full bg-[var(--color-chart)]"
              style={{ width: `${(c.revenue / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function StaleCard({ items }: { items: DashboardSummary['staleProducts'] }): React.JSX.Element {
  return (
    <Card title="Parados há mais de 60 dias" padded={false}>
      {items.length === 0 ? (
        <p className="p-5 text-sm text-stone-400">Nenhum produto parado. Bom giro de estoque!</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {items.map((p) => (
            <li key={p.id}>
              <Link
                to={`/estoque/${p.id}`}
                className="flex items-center gap-3 px-5 py-2.5 text-sm hover:bg-stone-50"
              >
                <ProductThumb file={p.coverPhoto} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate">{p.name}</div>
                  <div className="text-xs text-stone-500">desde {formatDate(p.createdAt)}</div>
                </div>
                <span className="tabular text-xs text-stone-600">
                  {formatCents(p.originalPrice)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
