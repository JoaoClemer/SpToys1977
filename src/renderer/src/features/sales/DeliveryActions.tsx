import { useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, Send, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SaleListItem } from '../../../../shared/api'
import { Button, Field, Input, Modal } from '../../components/ui'
import { CORREIOS_URL } from '../../lib/deliveries'
import { todayInput } from '../../lib/format'
import { ipc, useIpcMutation } from '../../lib/ipc'

/** Botões do fluxo de entrega para uma venda */
export function DeliveryActions({
  sale,
  size = 'md',
  showUndo = false
}: {
  sale: SaleListItem
  size?: 'sm' | 'md'
  showUndo?: boolean
}): React.JSX.Element | null {
  const [shipping, setShipping] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const reopen = useIpcMutation('sales:reopenDelivery', { success: 'Status revertido' })

  if (sale.canceledAt) return null

  return (
    <div className="flex flex-wrap gap-2">
      {sale.deliveryMethod === 'mail' && sale.deliveryStatus === 'pending' && (
        <Button size={size} variant="primary" onClick={() => setShipping(true)}>
          <Send size={14} /> Marcar como enviado
        </Button>
      )}
      {sale.deliveryStatus !== 'delivered' && (
        <Button
          size={size}
          variant={
            sale.deliveryMethod === 'mail' && sale.deliveryStatus === 'pending'
              ? 'secondary'
              : 'primary'
          }
          onClick={() => setDelivering(true)}
        >
          <CheckCircle2 size={14} /> Marcar como entregue
        </Button>
      )}
      {sale.trackingCode && <TrackingButtons code={sale.trackingCode} size={size} />}
      {showUndo && sale.deliveryStatus !== 'pending' && (
        <Button
          size={size}
          variant="ghost"
          onClick={() => reopen.mutate([sale.id])}
          disabled={reopen.isPending}
        >
          <Undo2 size={14} /> Desfazer último status
        </Button>
      )}
      {shipping && <ShipModal sale={sale} open onClose={() => setShipping(false)} />}
      {delivering && <DeliverModal sale={sale} open onClose={() => setDelivering(false)} />}
    </div>
  )
}

export function TrackingButtons({
  code,
  size = 'md'
}: {
  code: string
  size?: 'sm' | 'md'
}): React.JSX.Element {
  return (
    <>
      <Button
        size={size}
        variant="ghost"
        title="Copiar código de rastreio"
        onClick={() => {
          void navigator.clipboard.writeText(code)
          toast.success('Código copiado')
        }}
      >
        <Copy size={14} /> {code}
      </Button>
      <Button
        size={size}
        variant="ghost"
        title="Abrir rastreamento dos Correios (cole o código copiado)"
        onClick={() => {
          void navigator.clipboard.writeText(code)
          void ipc.invoke('app:openExternal', CORREIOS_URL)
          toast('Código copiado, cole no site dos Correios')
        }}
      >
        <ExternalLink size={14} /> Rastrear
      </Button>
    </>
  )
}

export function ShipModal({
  sale,
  open,
  onClose
}: {
  sale: SaleListItem
  open: boolean
  onClose: () => void
}): React.JSX.Element | null {
  const [code, setCode] = useState(sale.trackingCode ?? '')
  const [date, setDate] = useState(todayInput())
  const ship = useIpcMutation('sales:markShipped', { success: 'Venda marcada como enviada' })
  const submit = (): void =>
    ship.mutate([sale.id, { trackingCode: code.trim().toUpperCase(), shippedAt: date }], {
      onSuccess: onClose
    })
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Marcar como enviado"
      width="max-w-md"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={submit} disabled={ship.isPending}>
            Confirmar envio
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <p className="text-sm text-stone-600">
          {sale.productName} para <strong>{sale.buyerName}</strong>
        </p>
        <Field label="Código de rastreio" hint="(opcional, pode adicionar depois)">
          <Input
            autoFocus
            className="font-mono uppercase"
            placeholder="AA123456789BR"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </Field>
        <Field label="Data de envio">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

function DeliverModal({
  sale,
  open,
  onClose
}: {
  sale: SaleListItem
  open: boolean
  onClose: () => void
}): React.JSX.Element | null {
  const [date, setDate] = useState(todayInput())
  const deliver = useIpcMutation('sales:markDelivered', { success: 'Venda marcada como entregue' })
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Marcar como entregue"
      width="max-w-md"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => deliver.mutate([sale.id, date], { onSuccess: onClose })}
            disabled={deliver.isPending}
          >
            Confirmar entrega
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-stone-600">
          {sale.productName} para <strong>{sale.buyerName}</strong>
        </p>
        <Field label="Data da entrega">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
