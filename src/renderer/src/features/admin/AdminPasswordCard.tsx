import { useState } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { ADMIN_UNLOCK_MINUTES, PASSWORD_MIN_LENGTH } from '../../../../shared/schemas'
import { Button, Card, Field, Input } from '../../components/ui'
import { useAdminActions, useAdminStatus } from '../../lib/admin'

/** Configurações → Senha de administrador (cadastrar ou alterar) */
export function AdminPasswordCard(): React.JSX.Element {
  const status = useAdminStatus()
  const { setPassword } = useAdminActions()
  const [changing, setChanging] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const hasPassword = status?.hasPassword ?? false
  const showForm = !hasPassword || changing

  function reset(): void {
    setCurrent('')
    setNext('')
    setConfirm('')
    setError(null)
    setChanging(false)
  }

  async function save(): Promise<void> {
    if (next.length < PASSWORD_MIN_LENGTH) {
      return setError(`A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`)
    }
    if (next !== confirm) return setError('A confirmação não confere com a nova senha')
    setBusy(true)
    setError(null)
    try {
      await setPassword(hasPassword ? current : null, next)
      toast.success(hasPassword ? 'Senha alterada' : 'Senha cadastrada')
      reset()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onEnter = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') void save()
  }

  return (
    <Card title="Senha de administrador">
      <p className="mb-4 text-sm text-stone-600">
        Protege os <strong>dados restritos</strong> dos produtos: preço de compra, preço máximo de
        negociação e observações internas. Depois de digitar a senha, eles ficam visíveis por{' '}
        {ADMIN_UNLOCK_MINUTES} minutos ou até você clicar em “Bloquear”.
      </p>

      {hasPassword && !changing && (
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-sm text-emerald-700">
            <ShieldCheck size={18} /> Senha cadastrada
          </span>
          <Button onClick={() => setChanging(true)}>
            <KeyRound size={16} /> Alterar senha
          </Button>
        </div>
      )}

      {showForm && status && (
        <div className="space-y-3">
          {hasPassword && (
            <Field label="Senha atual">
              <Input
                type="password"
                autoFocus
                autoComplete="off"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                onKeyDown={onEnter}
              />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nova senha" hint={`(mín. ${PASSWORD_MIN_LENGTH} caracteres)`}>
              <Input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                onKeyDown={onEnter}
              />
            </Field>
            <Field label="Confirmar nova senha">
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={onEnter}
              />
            </Field>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => void save()} disabled={busy}>
              {hasPassword ? 'Salvar nova senha' : 'Cadastrar senha'}
            </Button>
            {changing && <Button onClick={reset}>Cancelar</Button>}
          </div>
          <p className="text-xs text-stone-400">
            Guarde a senha em local seguro. Se ela for esquecida, será preciso suporte técnico para
            redefini-la.
          </p>
        </div>
      )}
    </Card>
  )
}
