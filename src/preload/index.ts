import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { IpcResponse, RendererApi } from '../shared/api'

const api: RendererApi = {
  async invoke(channel, ...args) {
    const res: IpcResponse<never> = await ipcRenderer.invoke(channel, ...args)
    if (!res.ok) throw new Error(res.error)
    return res.data
  },
  getPathForFile: (file) => webUtils.getPathForFile(file)
}

contextBridge.exposeInMainWorld('api', api)
