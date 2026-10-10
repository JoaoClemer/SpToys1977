import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import type { IpcChannel, IpcResponse } from '../../shared/api'
import { appHandlers } from './app'
import { authHandlers } from './auth'
import { productHandlers } from './products'
import { salesHandlers } from './sales'
import type { Handlers } from './types'

const handlers: Handlers<IpcChannel> = {
  ...appHandlers,
  ...authHandlers,
  ...productHandlers,
  ...salesHandlers
}

function errorMessage(err: unknown): string {
  if (err instanceof ZodError) return err.issues.map((i) => i.message).join('; ')
  return err instanceof Error ? err.message : String(err)
}

export function registerIpc(): void {
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, async (_event, ...args): Promise<IpcResponse<unknown>> => {
      try {
        const data = await (handler as (...a: unknown[]) => unknown)(...args)
        return { ok: true, data }
      } catch (err) {
        console.error(`[ipc] ${channel}`, err)
        return { ok: false, error: errorMessage(err) }
      }
    })
  }
}
