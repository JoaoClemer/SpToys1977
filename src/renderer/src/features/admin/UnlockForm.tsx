import { useState } from 'react'
import { useNavigate } from 'react-router'
import { LockOpen } from 'lucide-react'
import { Button, Input } from '../../components/ui'
import { useAdminActions, useAdminStatus } from '../../lib/admin'

/**
 * Campo de senha para liberar os dados restritos. Não usa <form> para poder
 * ficar dentro de outros formulários (ex.: cadastro de produto).
 */
export function UnlockForm({
  onUnlocked,
  setupLink = true
}: {
  onUnlocked?: () => void
  /** Mostra botão para ir a Configurações quando ainda não há senha */
  setupLink?: boolean
}): React.JSX.Element | null {
  const status = useAdminStatus()
  const { unlock } = useAdminActions()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!status) return null
  if (!status.hasPassword) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        <span>
          Para usar os dados restritos, cadastre antes uma senha de administrador em Configurações.
        </span>
        {setupLink && (
          <Button size="sm" onClick={() => navigate('/configuracoes')}>
            Cadastrar senha
          </Button>
        )}
      </div>
    )
  }

  async function submit(): Promise<void> {
    if (!password || busy) return
    setBusy(true)
    setError(null)
    try {
      await unlock(password)
      setPassword('')
      onUnlocked?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <Input
          type="password"
          autoFocus
          autoComplete="off"
          aria-label="Senha de administrador"
          placeholder="Senha de administrador"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void submit()
            }
          }}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <Button variant="primary" onClick={() => void submit()} disabled={busy || !password}>
        <LockOpen size={16} /> {busy ? 'Verificando…' : 'Desbloquear'}
      </Button>
    </div>
  )
}
