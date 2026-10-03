import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult
} from '@tanstack/react-query'
import { toast } from 'sonner'
import type { IpcArgs, IpcChannel, IpcResult } from '../../../shared/api'

export const ipc = window.api

/** useQuery sobre um canal IPC. A queryKey é [canal, ...args]. */
export function useIpcQuery<C extends IpcChannel>(
  channel: C,
  ...args: IpcArgs<C>
): UseQueryResult<IpcResult<C>> {
  return useQuery({
    queryKey: [channel, ...args],
    queryFn: () => ipc.invoke(channel, ...args)
  })
}

/**
 * useMutation sobre um canal IPC. Após sucesso invalida todas as consultas
 * (dados locais e pequenos: mais simples e seguro que invalidação seletiva).
 * Erros viram toast automaticamente.
 */
export function useIpcMutation<C extends IpcChannel>(
  channel: C,
  opts: { success?: string } = {}
): UseMutationResult<IpcResult<C>, Error, IpcArgs<C>> {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: IpcArgs<C>) => ipc.invoke(channel, ...args),
    onSuccess: () => {
      void qc.invalidateQueries()
      if (opts.success) toast.success(opts.success)
    },
    onError: (err) => toast.error(err.message)
  })
}
