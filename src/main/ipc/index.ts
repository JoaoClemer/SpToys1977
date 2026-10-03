import { ipcMain } from 'electron'
import type { IpcApi, IpcChannel, IpcResponse } from '../../shared/api'
import { appHandlers } from './app'
import { productHandlers } from './products'

type Handlers = { [C in IpcChannel]: (...args: Parameters<IpcApi[C]>) => ReturnType<IpcApi[C]> }

const handlers: Handlers = {
  ...appHandlers,
  ...productHandlers
}

export function registerIpc(): void {
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, async (_event, ...args): Promise<IpcResponse<unknown>> => {
      try {
        const data = await (handler as (...a: unknown[]) => unknown)(...args)
        return { ok: true, data }
      } catch (err) {
        console.error(`[ipc] ${channel}`, err)
        return { ok: false, error: err instanceof Error ? err.message : String(err) }
      }
    })
  }
}
