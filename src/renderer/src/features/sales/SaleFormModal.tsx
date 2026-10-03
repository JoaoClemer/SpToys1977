import { useEffect, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Store, Truck, UserRound } from 'lucide-react'
import type { Customer, ProductDetail } from '../../../../shared/api'
import { ProductThumb } from '../../components/domain'
import { Button, Field, Input, Modal, MoneyInput, Textarea } from '../../components/ui'
import { cx } from '../../lib/cx'
import { formatCents, formatPhone, todayInput } from '../../lib/format'
import { useIpcMutation, useIpcQuery } from '../../lib/ipc'

interface FormValues {
  quantity: number
  unitPrice: number | null
  soldAt: string
  customerId: number | null
  buyerName: string
  buyerPhone: string
  buyerAddress: string
  deliveryMethod: 'in_person' | 'mail'
  deliveredNow: boolean
  shippingCost: number | null
  notes: string
}

export function SaleFormModal({
  open,
  onClose,
  product
}: {
  open: boolean
  onClose: () => void
  product: ProductDetail
}): React.JSX.Element | null {
  const navigate = useNavigate()
  const create = useIpcMutation('sales:create', { success: 'Venda registrada' })
  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<FormValues>()

  useEffect(() => {
    if (!open) return
    reset({
      quantity: 1,
      unitPrice: product.originalPrice,
      soldAt: todayInput(),
      customerId: null,
      buyerName: '',
      buyerPhone: '',
      buyerAddress: '',
      deliveryMethod: 'in_person',
      deliveredNow: true,
      shippingCost: null,
      notes: ''
    })
  }, [open, product, reset])

  const [quantity, unitPrice, method, shippingCost, buyerName, customerId] = useWatch({
    control,
    name: ['quantity', 'unitPrice', 'deliveryMethod', 'shippingCost', 'buyerName', 'customerId']
  })
  const total = (Number(quantity) || 0) * (unitPrice ?? 0)

  // Autocomplete de clientes
  const [showSuggestions, setShowSuggestions] = useState(false)
  const query = (buyerName ?? '').trim()
  const { data: suggestions = [] } = useIpcQuery('customers:search', query)
  const visibleSuggestions = showSuggestions && !customerId && query.length >= 2 ? suggestions : []

  function pickCustomer(c: Customer): void {
    setValue('customerId', c.id)
    setValue('buyerName', c.name, { shouldValidate: true })
    setValue('buyerPhone', c.phone ?? '')
    setValue('buyerAddress', c.address ?? '')
    setShowSuggestions(false)
  }

  const onSubmit = handleSubmit((v) => {
    create.mutate(
      [
        {
          productId: product.id,
          quantity: Number(v.quantity),
          unitPrice: v.unitPrice ?? 0,
          soldAt: v.soldAt,
          customerId: v.customerId,
          buyerName: v.buyerName,
          buyerPhone: v.buyerPhone,
          buyerAddress: v.buyerAddress,
          deliveryMethod: v.deliveryMethod,
          deliveredNow: v.deliveredNow,
          shippingCost: v.shippingCost,
          notes: v.notes
        }
      ],
      {
        onSuccess: (sale) => {
          onClose()
          navigate(`/vendas/${sale.id}`)
        }
      }
    )
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar venda"
      width="max-w-2xl"
      footer={
        <>
          <div className="mr-auto self-center text-sm text-stone-600">
            Total: <strong className="tabular text-stone-900">{formatCents(total)}</strong>
            {shippingCost ? (
              <span className="text-stone-400"> + {formatCents(shippingCost)} de frete</span>
            ) : null}
          </div>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onSubmit} disabled={create.isPending}>
            Confirmar venda
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="flex items-center gap-3 rounded-lg bg-stone-50 p-3">
          <ProductThumb file={product.photos[0] ?? null} size={48} />
          <div className="flex-1">
            <div className="font-medium">{product.name}</div>
            <div className="text-xs text-stone-500">
              {product.quantity} em estoque · preço original {formatCents(product.originalPrice)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Quantidade" error={errors.quantity?.message}>
            <Input
              type="number"
              min={1}
              max={product.quantity}
              className="tabular"
              {...register('quantity', {
                valueAsNumber: true,
                validate: (n) =>
                  (Number.isInteger(n) && n >= 1 && n <= product.quantity) ||
                  `Entre 1 e ${product.quantity}`
              })}
            />
          </Field>
          <Field label="Preço unitário" error={errors.unitPrice?.message}>
            <Controller
              control={control}
              name="unitPrice"
              rules={{ validate: (v) => v != null || 'Informe um preço válido' }}
              render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
            />
          </Field>
          <Field label="Data da venda">
            <Input type="date" {...register('soldAt', { required: true })} />
          </Field>
        </div>

        <fieldset className="space-y-4">
          <legend className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-stone-800">
            <UserRound size={16} /> Comprador
          </legend>
          <Field label="Nome" error={errors.buyerName?.message} className="relative">
            <Input
              autoComplete="off"
              placeholder="Digite para buscar clientes anteriores"
              {...register('buyerName', {
                validate: (s) => s.trim() !== '' || 'Informe o nome do comprador',
                onChange: () => {
                  setValue('customerId', null)
                  setShowSuggestions(true)
                }
              })}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            {visibleSuggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-stone-200 bg-white shadow-lg">
                {visibleSuggestions.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickCustomer(c)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
                    >
                      <span>
                        <span className="font-medium">{c.name}</span>
                        <span className="ml-2 text-xs text-stone-500">{formatPhone(c.phone)}</span>
                      </span>
                      <span className="text-xs text-stone-400">{c.purchases} compra(s)</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Field>
          <div className="grid grid-cols-[1fr_2fr] gap-4">
            <Field label="Telefone" hint="(opcional)">
              <Input placeholder="(11) 99999-9999" {...register('buyerPhone')} />
            </Field>
            <Field label="Endereço" hint="(opcional)">
              <Input placeholder="Rua, número, bairro, cidade, CEP" {...register('buyerAddress')} />
            </Field>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-stone-800">Entrega</legend>
          <Controller
            control={control}
            name="deliveryMethod"
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    {
                      value: 'in_person',
                      label: 'Presencial',
                      desc: 'Retirada na loja ou entrega em mãos',
                      Icon: Store
                    },
                    {
                      value: 'mail',
                      label: 'Correios',
                      desc: 'Envio com código de rastreio',
                      Icon: Truck
                    }
                  ] as const
                ).map(({ value, label, desc, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => field.onChange(value)}
                    className={cx(
                      'flex items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors',
                      field.value === value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-stone-200 hover:border-stone-300'
                    )}
                  >
                    <Icon
                      size={20}
                      className={field.value === value ? 'text-brand-600' : 'text-stone-400'}
                    />
                    <span>
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-stone-500">{desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          />
          <div className="mt-4 grid grid-cols-2 items-end gap-4">
            {method === 'in_person' ? (
              <label className="inline-flex h-9 cursor-pointer items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" className="accent-brand-600" {...register('deliveredNow')} />
                Já foi entregue ao comprador
              </label>
            ) : (
              <div />
            )}
            <Field label="Frete" hint="(opcional)">
              <Controller
                control={control}
                name="shippingCost"
                render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
              />
            </Field>
          </div>
        </fieldset>

        <Field label="Observações" hint="(opcional)">
          <Textarea rows={2} {...register('notes')} />
        </Field>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
