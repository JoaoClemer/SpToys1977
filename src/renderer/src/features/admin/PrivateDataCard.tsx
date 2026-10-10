import { useState } from 'react'
import { Eye, Lock, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { ProductPrivate } from '../../../../shared/api'
import { Button, Card, Modal } from '../../components/ui'
import { emptyPrivate, useAdminActions, useAdminStatus, useProductPrivate } from '../../lib/admin'
import { formatCents } from '../../lib/format'
import { PrivateFields } from './PrivateFields'
import { UnlockForm } from './UnlockForm'

/** Cartão "Dados restritos" na página do produto */
export function PrivateDataCard({
  productId,
  originalPrice
}: {
  productId: number
  originalPrice: number
}): React.JSX.Element {
  const status = useAdminStatus()
  const unlocked = status?.unlocked ?? false
  const { data } = useProductPrivate(productId, unlocked)
  const { lock } = useAdminActions()
  const [asking, setAsking] = useState(false)
  const [editing, setEditing] = useState(false)

  return (
    <Card
      title={
        <span className="flex items-center gap-1.5">
          <Lock size={14} className="text-stone-400" /> Dados restritos
        </span>
      }
      action={
        unlocked && (
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Editar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void lock()}>
              <Lock size={14} /> Bloquear
            </Button>
          </div>
        )
      }
    >
      {!unlocked ? (
        asking ? (
          <UnlockForm onUnlocked={() => setAsking(false)} />
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-stone-500">
              Preço de compra, preço máximo de negociação e observações internas.
            </p>
            <Button onClick={() => setAsking(true)}>
              <Eye size={16} /> Ver dados restritos
            </Button>
          </div>
        )
      ) : data ? (
        <PrivateSummary data={data} originalPrice={originalPrice} />
      ) : (
        <p className="text-sm text-stone-400">Carregando…</p>
      )}

      {editing && data && (
        <EditPrivateModal productId={productId} initial={data} onClose={() => setEditing(false)} />
      )}
    </Card>
  )
}

function PrivateSummary({
  data,
  originalPrice
}: {
  data: ProductPrivate
  originalPrice: number
}): React.JSX.Element {
  const profit = data.purchasePrice != null ? originalPrice - data.purchasePrice : null
  return (
    <dl className="space-y-2 text-sm">
      <Row
        label="Preço de compra"
        value={data.purchasePrice != null ? formatCents(data.purchasePrice) : '—'}
      />
      <Row
        label="Preço máximo de negociação"
        value={data.negotiationLimit != null ? formatCents(data.negotiationLimit) : '—'}
      />
      {profit != null && originalPrice > 0 && (
        <Row
          label="Lucro no preço original"
          value={`${formatCents(profit)} (${Math.round((profit / originalPrice) * 100)}%)`}
          muted
        />
      )}
      <div className="border-t border-stone-100 pt-2">
        <dt className="mb-1 text-stone-500">Observações internas</dt>
        <dd className="whitespace-pre-wrap text-stone-800">{data.privateNotes ?? '—'}</dd>
      </div>
    </dl>
  )
}

function Row({
  label,
  value,
  muted
}: {
  label: string
  value: string
  muted?: boolean
}): React.JSX.Element {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-stone-500">{label}</dt>
      <dd className={muted ? 'tabular text-stone-500' : 'tabular font-medium text-stone-900'}>
        {value}
      </dd>
    </div>
  )
}

function EditPrivateModal({
  productId,
  initial,
  onClose
}: {
  productId: number
  initial: ProductPrivate
  onClose: () => void
}): React.JSX.Element {
  const { savePrivate } = useAdminActions()
  const [value, setValue] = useState<ProductPrivate>({ ...emptyPrivate, ...initial })
  const [busy, setBusy] = useState(false)

  async function save(): Promise<void> {
    setBusy(true)
    try {
      await savePrivate(productId, value)
      toast.success('Dados restritos salvos')
      onClose()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar dados restritos"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            Salvar
          </Button>
        </>
      }
    >
      <PrivateFields value={value} onChange={setValue} />
    </Modal>
  )
}
