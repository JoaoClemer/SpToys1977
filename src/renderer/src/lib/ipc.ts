import { useQuery, type UseQueryResult } from '@tanstack/react-query'
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
