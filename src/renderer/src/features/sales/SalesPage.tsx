import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Receipt, Search } from 'lucide-react'
import type { SaleFilters } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
import { DeliveryBadge, MethodLabel, ProductThumb } from '../../components/domain'
import { EmptyState, Input, Select } from '../../components/ui'
import { cx } from '../../lib/cx'
import { formatCents, formatDate } from '../../lib/format'
import { useIpcQuery } from '../../lib/ipc'

type Status = NonNullable<NonNullable<SaleFilters>['status']>
type Method = NonNullable<NonNullable<SaleFilters>['method']>

export function SalesPage(): React.JSX.Element {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<Status>('all')
  const [method, setMethod] = useState<Method>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: sales = [], isLoading } = useIpcQuery('sales:list', {
    search: search || undefined,
    status,
    method,
    from: from || undefined,
    to: to || undefined
  })
  const active = sales.filter((s) => !s.canceledAt)
  const revenue = active.reduce((sum, s) => sum + s.total, 0)
  const shipping = active.reduce((sum, s) => sum + (s.shippingCost ?? 0), 0)

  return (
    <>
      <PageHeader title="Vendas" subtitle="Registre vendas pela página do produto, no Estoque" />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400"
          />
          <Input
            className="pl-9"
            placeholder="Comprador, produto, rastreio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-52"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
        >
          <option value="all">Todos os status</option>
          <option value="open">Entrega em aberto</option>
          <option value="pending">Aguardando envio/retirada</option>
          <option value="shipped">Enviado</option>
          <option value="delivered">Entregue</option>
          <option value="canceled">Canceladas</option>
        </Select>
        <Select
          className="w-40"
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
        >
          <option value="all">Todos os métodos</option>
          <option value="in_person">Presencial</option>
          <option value="mail">Correios</option>
        </Select>
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Input
            type="date"
            className="w-40"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="De"
          />
          até
          <Input
            type="date"
            className="w-40"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="Até"
          />
        </div>
      </div>

      <div className="mb-4 flex gap-6 text-sm text-stone-600">
        <span>
          <strong className="tabular text-stone-900">{active.length}</strong> venda(s)
        </span>
        <span>
          Faturamento: <strong className="tabular text-stone-900">{formatCents(revenue)}</strong>
        </span>
        {shipping > 0 && (
          <span>
            Frete: <strong className="tabular text-stone-900">{formatCents(shipping)}</strong>
          </span>
        )}
      </div>

      {!isLoading && sales.length === 0 ? (
        <EmptyState icon={<Receipt size={40} />} title="Nenhuma venda encontrada">
          Para vender, abra um produto no Estoque e clique em “Registrar venda”.
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs tracking-wide text-stone-500 uppercase">
              <tr>
                <th className="px-4 py-2.5 font-medium">Data</th>
                <th className="px-4 py-2.5 font-medium">Produto</th>
                <th className="px-4 py-2.5 font-medium">Comprador</th>
                <th className="px-4 py-2.5 font-medium">Entrega</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sales.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/vendas/${s.id}`)}
                  className={cx(
                    'cursor-pointer hover:bg-stone-50',
                    s.canceledAt && 'text-stone-400'
                  )}
                >
                  <td className="tabular px-4 py-2.5 whitespace-nowrap">{formatDate(s.soldAt)}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <ProductThumb file={s.productPhoto} size={36} />
                      <span className={cx('line-clamp-1', s.canceledAt && 'line-through')}>
                        {s.productName}
                        {s.quantity > 1 && <span className="text-stone-400"> ×{s.quantity}</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">{s.buyerName}</td>
                  <td className="px-4 py-2.5">
                    <MethodLabel method={s.deliveryMethod} />
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-medium">
                    {formatCents(s.total)}
                  </td>
                  <td className="px-4 py-2.5">
                    <DeliveryBadge sale={s} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
