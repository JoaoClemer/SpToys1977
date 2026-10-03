import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Ban, Check, MapPin, Pencil, Phone, UserRound } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import type { SaleListItem } from '../../../../shared/api'
import { DeliveryBadge, MethodLabel, ProductThumb } from '../../components/domain'
import {
  Button,
  Card,
  ConfirmModal,
  Field,
  Input,
  Modal,
  MoneyInput,
  Textarea
} from '../../components/ui'
import { cx } from '../../lib/cx'
import { formatCents, formatDate, formatPhone } from '../../lib/format'
import { useIpcMutation, useIpcQuery } from '../../lib/ipc'
import { DeliveryActions } from './DeliveryActions'

export function SaleDetailPage(): React.JSX.Element {
  const id = Number(useParams().id)
  const { data: s, error } = useIpcQuery('sales:get', id)
  const [editing, setEditing] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const cancel = useIpcMutation('sales:cancel', { success: 'Venda cancelada e estoque devolvido' })

  if (error) return <p className="text-red-600">{error.message}</p>
  if (!s) return <></>

  return (
    <>
      <Link
        to="/vendas"
        className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft size={16} /> Vendas
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <DeliveryBadge sale={s} />
            <span className="text-sm text-stone-500">Venda #{s.id}</span>
          </div>
          <h1 className="text-2xl font-semibold">{s.buyerName}</h1>
          <div className="text-sm text-stone-500">Vendido em {formatDate(s.soldAt)}</div>
        </div>
        {!s.canceledAt && (
          <div className="flex gap-2">
            <Button onClick={() => setEditing(true)}>
              <Pencil size={16} /> Editar
            </Button>
            <Button variant="ghost" className="text-red-600" onClick={() => setCanceling(true)}>
              <Ban size={16} /> Cancelar venda
            </Button>
          </div>
        )}
      </div>

      {s.canceledAt && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Venda cancelada em {formatDate(s.canceledAt)}. A quantidade voltou para o estoque.
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
        <div className="space-y-6">
          <Card title="Entrega">
            <div className="mb-5 flex items-center gap-2 text-sm">
              <MethodLabel method={s.deliveryMethod} />
            </div>
            <Timeline sale={s} />
            <div className="mt-5">
              <DeliveryActions sale={s} showUndo />
            </div>
          </Card>

          <Card title="Produto" padded={false}>
            <Link
              to={`/estoque/${s.productId}`}
              className="flex items-center gap-4 p-5 hover:bg-stone-50"
            >
              <ProductThumb file={s.productPhoto} size={64} />
              <div className="flex-1">
                <div className="font-medium">{s.productName}</div>
                <div className="tabular text-sm text-stone-500">
                  {s.quantity} × {formatCents(s.unitPrice)}
                </div>
              </div>
            </Link>
          </Card>

          {s.notes && (
            <Card title="Observações">
              <p className="text-sm whitespace-pre-wrap text-stone-700">{s.notes}</p>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Valores">
            <dl className="tabular space-y-2 text-sm">
              <Row label="Subtotal" value={formatCents(s.total)} />
              <Row
                label="Frete"
                value={s.shippingCost != null ? formatCents(s.shippingCost) : '—'}
              />
              <div className="border-t border-stone-100 pt-2">
                <Row
                  label="Total cobrado"
                  value={formatCents(s.total + (s.shippingCost ?? 0))}
                  strong
                />
              </div>
            </dl>
          </Card>

          <Card title="Comprador">
            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <UserRound size={16} className="mt-0.5 shrink-0 text-stone-400" /> {s.buyerName}
              </li>
              <li className="flex gap-2">
                <Phone size={16} className="mt-0.5 shrink-0 text-stone-400" />{' '}
                {formatPhone(s.buyerPhone)}
              </li>
              <li className="flex gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-stone-400" />
                <span className="whitespace-pre-wrap">{s.buyerAddress ?? '—'}</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {editing && <EditSaleModal sale={s} onClose={() => setEditing(false)} />}
      <ConfirmModal
        open={canceling}
        onClose={() => setCanceling(false)}
        title="Cancelar venda"
        message={
          <>
            Cancelar a venda para <strong>{s.buyerName}</strong>? {s.quantity} unidade(s) de “
            {s.productName}” voltarão para o estoque. O registro fica no histórico marcado como
            cancelado.
          </>
        }
        confirmLabel="Cancelar venda"
        danger
        busy={cancel.isPending}
        onConfirm={() => cancel.mutate([s.id], { onSuccess: () => setCanceling(false) })}
      />
    </>
  )
}

function Row({
  label,
  value,
  strong
}: {
  label: string
  value: string
  strong?: boolean
}): React.JSX.Element {
  return (
    <div className="flex justify-between">
      <dt className="text-stone-500">{label}</dt>
      <dd className={cx(strong && 'text-base font-semibold')}>{value}</dd>
    </div>
  )
}

function Timeline({ sale: s }: { sale: SaleListItem }): React.JSX.Element {
  const steps =
    s.deliveryMethod === 'mail'
      ? [
          { label: 'Vendido', date: s.soldAt, done: true },
          { label: 'Enviado', date: s.shippedAt, done: s.deliveryStatus !== 'pending' },
          { label: 'Entregue', date: s.deliveredAt, done: s.deliveryStatus === 'delivered' }
        ]
      : [
          { label: 'Vendido', date: s.soldAt, done: true },
          { label: 'Entregue', date: s.deliveredAt, done: s.deliveryStatus === 'delivered' }
        ]
  return (
    <ol className="flex items-start">
      {steps.map((step, i) => (
        <li key={step.label} className="flex flex-1 flex-col items-center text-center">
          <div className="flex w-full items-center">
            <div
              className={cx(
                'h-0.5 flex-1',
                i === 0 ? 'invisible' : step.done ? 'bg-brand-500' : 'bg-stone-200'
              )}
            />
            <div
              className={cx(
                'flex h-8 w-8 items-center justify-center rounded-full border-2',
                step.done
                  ? 'border-brand-500 bg-brand-500 text-white'
                  : 'border-stone-300 bg-white text-stone-300'
              )}
            >
              <Check size={16} />
            </div>
            <div
              className={cx(
                'h-0.5 flex-1',
                i === steps.length - 1
                  ? 'invisible'
                  : steps[i + 1].done
                    ? 'bg-brand-500'
                    : 'bg-stone-200'
              )}
            />
          </div>
          <div className={cx('mt-2 text-sm font-medium', !step.done && 'text-stone-400')}>
            {step.label}
          </div>
          <div className="text-xs text-stone-500">{step.done ? formatDate(step.date) : '—'}</div>
          {step.label === 'Enviado' && s.trackingCode && (
            <div className="mt-1 font-mono text-xs text-stone-600">{s.trackingCode}</div>
          )}
        </li>
      ))}
    </ol>
  )
}

interface EditValues {
  unitPrice: number | null
  buyerName: string
  buyerPhone: string
  buyerAddress: string
  shippingCost: number | null
  trackingCode: string
  notes: string
}

function EditSaleModal({
  sale,
  onClose
}: {
  sale: SaleListItem
  onClose: () => void
}): React.JSX.Element {
  const update = useIpcMutation('sales:update', { success: 'Venda atualizada' })
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<EditValues>()
  useEffect(() => {
    reset({
      unitPrice: sale.unitPrice,
      buyerName: sale.buyerName,
      buyerPhone: sale.buyerPhone ?? '',
      buyerAddress: sale.buyerAddress ?? '',
      shippingCost: sale.shippingCost,
      trackingCode: sale.trackingCode ?? '',
      notes: sale.notes ?? ''
    })
  }, [sale, reset])
  const onSubmit = handleSubmit((v) =>
    update.mutate(
      [
        sale.id,
        { ...v, unitPrice: v.unitPrice ?? 0, trackingCode: v.trackingCode.trim().toUpperCase() }
      ],
      { onSuccess: onClose }
    )
  )
  return (
    <Modal
      open
      onClose={onClose}
      title="Editar venda"
      width="max-w-xl"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onSubmit} disabled={update.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome do comprador" error={errors.buyerName?.message}>
          <Input
            {...register('buyerName', { validate: (s) => s.trim() !== '' || 'Informe o nome' })}
          />
        </Field>
        <div className="grid grid-cols-[1fr_2fr] gap-4">
          <Field label="Telefone" hint="(opcional)">
            <Input {...register('buyerPhone')} />
          </Field>
          <Field label="Endereço" hint="(opcional)">
            <Input {...register('buyerAddress')} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Preço unitário" error={errors.unitPrice?.message}>
            <Controller
              control={control}
              name="unitPrice"
              rules={{ validate: (v) => v != null || 'Preço inválido' }}
              render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
            />
          </Field>
          <Field label="Frete" hint="(opcional)">
            <Controller
              control={control}
              name="shippingCost"
              render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
            />
          </Field>
          {sale.deliveryMethod === 'mail' && (
            <Field label="Rastreio">
              <Input className="font-mono uppercase" {...register('trackingCode')} />
            </Field>
          )}
        </div>
        <Field label="Observações" hint="(opcional)">
          <Textarea rows={2} {...register('notes')} />
        </Field>
        <p className="text-xs text-stone-400">
          Para mudar produto ou quantidade, cancele esta venda e registre uma nova.
        </p>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
