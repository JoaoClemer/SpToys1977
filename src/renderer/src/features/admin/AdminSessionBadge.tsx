import { useEffect, useState } from 'react'
import { Lock, LockOpen } from 'lucide-react'
import { ADMIN_UNLOCK_MINUTES } from '../../../../shared/schemas'
import { useAdminActions, useAdminStatus } from '../../lib/admin'

/** Aviso no menu lateral enquanto os dados restritos estão liberados */
export function AdminSessionBadge(): React.JSX.Element | null {
  const status = useAdminStatus()
  const { lock } = useAdminActions()
  const [now, setNow] = useState(() => Date.now())

  // Atualiza o relógio ao desbloquear e a cada 15s enquanto liberado
  const expiresAt = status?.expiresAt
  useEffect(() => {
    if (!expiresAt) return
    const tick = (): void => setNow(Date.now())
    const first = setTimeout(tick, 0)
    const t = setInterval(tick, 15_000)
    return () => {
      clearTimeout(first)
      clearInterval(t)
    }
  }, [expiresAt])

  if (!status?.unlocked || !status.expiresAt) return null
  const minutes = Math.min(
    ADMIN_UNLOCK_MINUTES,
    Math.max(1, Math.ceil((status.expiresAt - now) / 60_000))
  )

  return (
    <div className="m-3 mt-auto rounded-lg bg-amber-400/15 p-3 text-xs text-amber-100">
      <div className="flex items-center gap-1.5 font-medium text-amber-200">
        <LockOpen size={14} /> Dados restritos liberados
      </div>
      <div className="mt-0.5 text-amber-100/70">Bloqueia em {minutes} min</div>
      <button
        type="button"
        onClick={() => void lock()}
        className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-amber-400 px-2 py-1.5 font-semibold text-brand-900 hover:bg-amber-300"
      >
        <Lock size={13} /> Bloquear agora
      </button>
    </div>
  )
}
