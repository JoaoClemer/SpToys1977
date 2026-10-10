import { useEffect } from 'react'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { AdminStatus, ProductPrivate } from '../../../shared/api'
import { ipc } from './ipc'

export const emptyPrivate: ProductPrivate = {
  purchasePrice: null,
  negotiationLimit: null,
  privateNotes: null
}

const STATUS_KEY = ['auth:status']
const PRIVATE_KEY = 'products:getPrivate'

/**
 * Estado da senha de administrador. Rebloqueia a tela quando o desbloqueio expira
 * e descarta do cache qualquer dado restrito assim que fica bloqueado.
 */
export function useAdminStatus(): AdminStatus | undefined {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: STATUS_KEY,
    queryFn: () => ipc.invoke('auth:status')
  })
  const unlocked = data?.unlocked ?? false
  const expiresAt = data?.expiresAt

  useEffect(() => {
    if (!expiresAt) return
    const t = setTimeout(
      () => void qc.invalidateQueries({ queryKey: STATUS_KEY }),
      Math.max(0, expiresAt - Date.now()) + 250
    )
    return () => clearTimeout(t)
  }, [expiresAt, qc])

  useEffect(() => {
    if (!unlocked) qc.removeQueries({ queryKey: [PRIVATE_KEY] })
  }, [unlocked, qc])

  return data
}

export function useProductPrivate(
  id: number | undefined,
  unlocked: boolean
): UseQueryResult<ProductPrivate> {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: [PRIVATE_KEY, id],
    queryFn: () => ipc.invoke('products:getPrivate', id!),
    enabled: unlocked && id != null
  })
  // Erro aqui normalmente é desbloqueio expirado: atualiza o estado para bloquear a tela
  useEffect(() => {
    if (query.error) void qc.invalidateQueries({ queryKey: STATUS_KEY })
  }, [query.error, qc])
  return query
}

export function useAdminActions(): {
  unlock: (password: string) => Promise<void>
  lock: () => Promise<void>
  setPassword: (current: string | null, next: string) => Promise<void>
  savePrivate: (id: number, data: ProductPrivate) => Promise<void>
} {
  const qc = useQueryClient()
  const apply = (s: AdminStatus): void => {
    qc.setQueryData(STATUS_KEY, s)
    if (!s.unlocked) qc.removeQueries({ queryKey: [PRIVATE_KEY] })
  }
  return {
    unlock: async (password) => apply(await ipc.invoke('auth:unlock', password)),
    lock: async () => apply(await ipc.invoke('auth:lock')),
    setPassword: async (current, next) =>
      apply(await ipc.invoke('auth:setPassword', current, next)),
    savePrivate: async (id, data) => {
      qc.setQueryData([PRIVATE_KEY, id], await ipc.invoke('products:setPrivate', id, data))
    }
  }
}
