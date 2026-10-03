import type { IpcArgs, IpcChannel, IpcResult } from '../../shared/api'

export type Handlers<C extends IpcChannel> = {
  [K in C]: (...args: IpcArgs<K>) => IpcResult<K> | Promise<IpcResult<K>>
}
