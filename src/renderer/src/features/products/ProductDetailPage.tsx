import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ImageOff,
  Pencil,
  ShoppingBag,
  Trash2
} from 'lucide-react'
import { DeliveryBadge, MethodLabel, StockBadge } from '../../components/domain'
import { Button, Card, ConfirmModal, EmptyState } from '../../components/ui'
import { cx } from '../../lib/cx'
import { formatCents, formatDate, photoUrl } from '../../lib/format'
import { useIpcMutation, useIpcQuery } from '../../lib/ipc'
import { PrivateDataCard } from '../admin/PrivateDataCard'
import { SaleFormModal } from '../sales/SaleFormModal'
import { ProductFormModal } from './ProductFormModal'

export function ProductDetailPage(): React.JSX.Element {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const { data: p, error } = useIpcQuery('products:get', id)
  const [photoIdx, setPhotoIdx] = useState(0)
  const [editing, setEditing] = useState(false)
  const [selling, setSelling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const archive = useIpcMutation('products:setArchived')
  const del = useIpcMutation('products:delete', { success: 'Produto excluído' })

  if (error) return <p className="text-red-600">{error.message}</p>
  if (!p) return <></>

  const current = p.photos[Math.min(photoIdx, p.photos.length - 1)]
  const activeSales = p.sales.filter((s) => !s.canceledAt)
  const revenue = activeSales.reduce((sum, s) => sum + s.total, 0)
  const soldUnits = activeSales.reduce((sum, s) => sum + s.quantity, 0)

  return (
    <>
      <Link
        to="/estoque"
        className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft size={16} /> Estoque
      </Link>

      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-8">
        {/* Galeria */}
        <div>
          <div className="aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-100">
            {current ? (
              <img
                src={photoUrl(current, 'full')}
                alt={p.name}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-stone-400">
                <ImageOff size={40} /> Sem fotos
              </div>
            )}
          </div>
          {p.photos.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {p.photos.map((f, i) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setPhotoIdx(i)}
                  className={cx(
                    'h-16 w-16 overflow-hidden rounded-md border-2',
                    f === current
                      ? 'border-brand-500'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  )}
                >
                  <img src={photoUrl(f)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dados */}
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StockBadge quantity={p.quantity} archived={p.archived} />
              {p.category && <span className="text-sm text-stone-500">{p.category}</span>}
            </div>
            <h1 className="text-2xl font-semibold">{p.name}</h1>
            <div className="tabular mt-2 text-3xl font-semibold text-brand-700">
              {formatCents(p.originalPrice)}
            </div>
            <div className="mt-1 text-xs text-stone-400">
              Cadastrado em {formatDate(p.createdAt)}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={p.quantity === 0 || p.archived}
              onClick={() => setSelling(true)}
            >
              <ShoppingBag size={16} /> Registrar venda
            </Button>
            <Button onClick={() => setEditing(true)}>
              <Pencil size={16} /> Editar
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                archive.mutate([p.id, !p.archived], {
                  onSuccess: () => navigate(p.archived ? `/estoque/${p.id}` : '/estoque')
                })
              }
            >
              {p.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              {p.archived ? 'Desarquivar' : 'Arquivar'}
            </Button>
            {p.sales.length === 0 && (
              <Button variant="ghost" className="text-red-600" onClick={() => setDeleting(true)}>
                <Trash2 size={16} /> Excluir
              </Button>
            )}
          </div>

          {p.description && (
            <Card title="Descrição">
              <p className="text-sm whitespace-pre-wrap text-stone-700">{p.description}</p>
            </Card>
          )}

          <PrivateDataCard productId={p.id} originalPrice={p.originalPrice} />

          <Card
            title="Histórico de vendas"
            action={
              soldUnits > 0 && (
                <span className="tabular text-xs text-stone-500">
                  {soldUnits} un. · {formatCents(revenue)}
                </span>
              )
            }
            padded={false}
          >
            {p.sales.length === 0 ? (
              <div className="p-5">
                <EmptyState title="Nenhuma venda ainda" />
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {p.sales.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/vendas/${s.id}`}
                      className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-stone-50"
                    >
                      <div className="flex-1">
                        <div
                          className={cx('font-medium', s.canceledAt && 'line-through opacity-60')}
                        >
                          {s.buyerName}
                        </div>
                        <div className="text-xs text-stone-500">
                          {formatDate(s.soldAt)} · {s.quantity} un. ·{' '}
                          <MethodLabel method={s.deliveryMethod} />
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
        </div>
      </div>

      <ProductFormModal open={editing} onClose={() => setEditing(false)} product={p} />
      <SaleFormModal open={selling} onClose={() => setSelling(false)} product={p} />
      <ConfirmModal
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Excluir produto"
        message={
          <>
            Excluir <strong>{p.name}</strong> e suas fotos? Essa ação não pode ser desfeita.
          </>
        }
        confirmLabel="Excluir"
        danger
        busy={del.isPending}
        onConfirm={() => del.mutate([p.id], { onSuccess: () => navigate('/estoque') })}
      />
    </>
  )
}
