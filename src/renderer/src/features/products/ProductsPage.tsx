import { useState } from 'react'
import { Link } from 'react-router'
import { Archive, PackageOpen, Plus, Search } from 'lucide-react'
import type { ProductFilters } from '../../../../shared/schemas'
import { PageHeader } from '../../components/PageHeader'
import { StockBadge } from '../../components/domain'
import { Button, EmptyState, Input, Segmented, Select } from '../../components/ui'
import { cx } from '../../lib/cx'
import { formatCents, photoUrl } from '../../lib/format'
import { useIpcQuery } from '../../lib/ipc'
import { ProductFormModal } from './ProductFormModal'

type Status = NonNullable<NonNullable<ProductFilters>['status']>

export function ProductsPage(): React.JSX.Element {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState<Status>('available')
  const [archived, setArchived] = useState(false)
  const [creating, setCreating] = useState(false)

  const { data: categories = [] } = useIpcQuery('products:categories')
  const { data: products = [], isLoading } = useIpcQuery('products:list', {
    search: search || undefined,
    category: category || undefined,
    status,
    archived
  })
  const filtered = Boolean(search || category || status !== 'all' || archived)

  return (
    <>
      <PageHeader
        title="Estoque"
        subtitle={isLoading ? '…' : `${products.length} produto(s)`}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus size={16} /> Novo produto
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400"
          />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, descrição…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select className="w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Segmented<Status>
          value={status}
          onChange={setStatus}
          options={[
            { value: 'available', label: 'Disponíveis' },
            { value: 'sold', label: 'Vendidos' },
            { value: 'all', label: 'Todos' }
          ]}
        />
        <label className="ml-auto inline-flex cursor-pointer items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
            className="accent-brand-600"
          />
          <Archive size={14} /> Ver arquivados
        </label>
      </div>

      {!isLoading && products.length === 0 ? (
        <EmptyState
          icon={<PackageOpen size={40} />}
          title={filtered ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado ainda'}
        >
          {filtered ? 'Tente mudar os filtros.' : 'Clique em “Novo produto” para começar.'}
        </EmptyState>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              to={`/estoque/${p.id}`}
              className="group overflow-hidden rounded-xl border border-stone-200 bg-white transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[4/3] bg-stone-100">
                {p.coverPhoto ? (
                  <img
                    src={photoUrl(p.coverPhoto)}
                    alt=""
                    className={cx(
                      'h-full w-full object-cover',
                      p.quantity === 0 && 'opacity-60 grayscale'
                    )}
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-stone-400">
                    Sem foto
                  </div>
                )}
                {p.photoCount > 1 && (
                  <span className="absolute right-2 bottom-2 rounded bg-black/55 px-1.5 py-0.5 text-[11px] text-white">
                    {p.photoCount} fotos
                  </span>
                )}
                <div className="absolute top-2 left-2 shadow-sm">
                  <StockBadge quantity={p.quantity} archived={p.archived} />
                </div>
              </div>
              <div className="space-y-1 p-3">
                <div className="line-clamp-2 min-h-10 text-sm font-medium text-stone-900 group-hover:text-brand-700">
                  {p.name}
                </div>
                <div className="text-xs text-stone-500">{p.category ?? 'Sem categoria'}</div>
                <div className="tabular pt-1 font-semibold">{formatCents(p.originalPrice)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ProductFormModal open={creating} onClose={() => setCreating(false)} />
    </>
  )
}
