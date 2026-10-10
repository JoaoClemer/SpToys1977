import { useEffect, useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import type { ProductPrivate } from '../../../../shared/api'
import { Button } from '../../components/ui'
import { emptyPrivate, useAdminStatus, useProductPrivate } from '../../lib/admin'
import { PrivateFields } from './PrivateFields'
import { UnlockForm } from './UnlockForm'

/**
 * Seção "Dados restritos" dentro do formulário de produto.
 * `value` fica null enquanto bloqueado (nada será gravado); ao desbloquear,
 * recebe os valores atuais do produto (ou vazios, se for um produto novo).
 */
export function PrivateFieldsSection({
  productId,
  value,
  onChange
}: {
  productId?: number
  value: ProductPrivate | null
  onChange: (v: ProductPrivate | null) => void
}): React.JSX.Element {
  const status = useAdminStatus()
  const unlocked = status?.unlocked ?? false
  const { data: current } = useProductPrivate(productId, unlocked)
  const [asking, setAsking] = useState(false)

  // Preenche os campos assim que os dados ficam disponíveis
  useEffect(() => {
    if (!unlocked) {
      if (value !== null) onChange(null)
      return
    }
    if (value === null) {
      if (productId == null) onChange(emptyPrivate)
      else if (current) onChange(current)
    }
  }, [unlocked, current, productId, value, onChange])

  return (
    <div className="rounded-lg border border-stone-200 p-4">
      <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-stone-700">
        {unlocked ? <LockOpen size={14} /> : <Lock size={14} />} Dados restritos
        <span className="font-normal text-stone-400">(opcional, protegido por senha)</span>
      </div>
      {unlocked && value ? (
        <PrivateFields value={value} onChange={onChange} />
      ) : unlocked ? (
        <p className="text-sm text-stone-400">Carregando…</p>
      ) : asking ? (
        <UnlockForm onUnlocked={() => setAsking(false)} setupLink={false} />
      ) : (
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-stone-500">
            Preço de compra, preço máximo de negociação e observações internas.
          </p>
          <Button size="sm" onClick={() => setAsking(true)}>
            <LockOpen size={14} /> Desbloquear para preencher
          </Button>
        </div>
      )}
    </div>
  )
}
