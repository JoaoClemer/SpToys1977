import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import type { ProductDetail } from '../../../../shared/api'
import { Button, Field, Input, Modal, MoneyInput, Textarea } from '../../components/ui'
import { useIpcMutation, useIpcQuery } from '../../lib/ipc'
import { PhotoManager } from './PhotoManager'

interface FormValues {
  name: string
  category: string
  description: string
  originalPrice: number | null
  quantity: number
  photos: string[]
}

const empty: FormValues = {
  name: '',
  category: '',
  description: '',
  originalPrice: null,
  quantity: 1,
  photos: []
}

export function ProductFormModal({
  open,
  onClose,
  product
}: {
  open: boolean
  onClose: () => void
  /** Ausente = novo produto */
  product?: ProductDetail
}): React.JSX.Element | null {
  const navigate = useNavigate()
  const { data: categories = [] } = useIpcQuery('products:categories')
  const create = useIpcMutation('products:create', { success: 'Produto cadastrado' })
  const update = useIpcMutation('products:update', { success: 'Produto atualizado' })

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FormValues>({ defaultValues: empty })

  useEffect(() => {
    if (!open) return
    reset(
      product
        ? {
            name: product.name,
            category: product.category ?? '',
            description: product.description ?? '',
            originalPrice: product.originalPrice,
            quantity: product.quantity,
            photos: product.photos
          }
        : empty
    )
  }, [open, product, reset])

  const onSubmit = handleSubmit((v) => {
    const input = {
      name: v.name,
      category: v.category,
      description: v.description,
      originalPrice: v.originalPrice ?? 0,
      quantity: Number(v.quantity),
      photos: v.photos
    }
    if (product) {
      update.mutate([product.id, input], { onSuccess: onClose })
    } else {
      create.mutate([input], {
        onSuccess: (p) => {
          onClose()
          navigate(`/estoque/${p.id}`)
        }
      })
    }
  })

  const busy = create.isPending || update.isPending

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Editar produto' : 'Novo produto'}
      width="max-w-2xl"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onSubmit} disabled={busy}>
            {product ? 'Salvar alterações' : 'Cadastrar produto'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome" error={errors.name?.message}>
          <Input
            autoFocus
            placeholder="Ex.: Carrinho de ferro Estrela 1970"
            {...register('name', {
              required: 'Informe o nome',
              validate: (s) => s.trim() !== '' || 'Informe o nome'
            })}
          />
        </Field>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Preço original" error={errors.originalPrice?.message}>
            <Controller
              control={control}
              name="originalPrice"
              rules={{ validate: (v) => v != null || 'Informe um preço válido' }}
              render={({ field }) => <MoneyInput value={field.value} onChange={field.onChange} />}
            />
          </Field>
          <Field label="Quantidade" error={errors.quantity?.message}>
            <Input
              type="number"
              min={0}
              step={1}
              className="tabular"
              {...register('quantity', {
                valueAsNumber: true,
                validate: (n) => (Number.isInteger(n) && n >= 0) || 'Quantidade inválida'
              })}
            />
          </Field>
          <Field label="Categoria" hint="(opcional)">
            <Input
              list="product-categories"
              placeholder="Ex.: Brinquedos"
              {...register('category')}
            />
            <datalist id="product-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>

        <Field label="Descrição" hint="(opcional)">
          <Textarea
            placeholder="Estado de conservação, época, fabricante…"
            {...register('description')}
          />
        </Field>

        <div>
          <span className="mb-1 block text-sm font-medium text-stone-700">Fotos</span>
          <Controller
            control={control}
            name="photos"
            render={({ field }) => <PhotoManager photos={field.value} onChange={field.onChange} />}
          />
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
