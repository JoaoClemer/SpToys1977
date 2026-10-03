/**
 * Contrato da API IPC entre renderer e main.
 * Cada chave é um canal `ipcMain.handle`; o preload expõe um invoke tipado.
 */

export interface AppInfo {
  version: string
  dbPath: string
  productCount: number
}

export interface ProductListItem {
  id: number
  name: string
  category: string | null
  originalPrice: number
  quantity: number
}

export interface IpcApi {
  'app:info': () => AppInfo
  'products:list': () => ProductListItem[]
}

export type IpcChannel = keyof IpcApi

export type IpcArgs<C extends IpcChannel> = Parameters<IpcApi[C]>
export type IpcResult<C extends IpcChannel> = Awaited<ReturnType<IpcApi[C]>>

/** Resposta serializada: erros de negócio viajam como dados, não como exceções do Electron. */
export type IpcResponse<T> = { ok: true; data: T } | { ok: false; error: string }

export interface RendererApi {
  invoke<C extends IpcChannel>(channel: C, ...args: IpcArgs<C>): Promise<IpcResult<C>>
}
