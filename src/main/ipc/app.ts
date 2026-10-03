import { app, BrowserWindow, shell } from 'electron'
import { getDataPath, getDbPath } from '../db/client'
import { backupService } from '../services/backup'
import { dashboardService } from '../services/dashboard'
import type { Handlers } from './types'

export const appHandlers: Handlers<
  | 'app:info'
  | 'app:openDataFolder'
  | 'app:openExternal'
  | 'dashboard:summary'
  | 'backup:create'
  | 'backup:restore'
> = {
  'app:info': () => ({
    version: app.getVersion(),
    dataPath: getDataPath(),
    dbPath: getDbPath()
  }),
  'app:openDataFolder': () => {
    void shell.openPath(getDataPath())
  },
  'app:openExternal': (url) => {
    if (!/^https:\/\//.test(url)) throw new Error('URL inválida')
    void shell.openExternal(url)
  },
  'dashboard:summary': () => dashboardService.summary(),
  'backup:create': () => backupService.create(BrowserWindow.getFocusedWindow()),
  'backup:restore': () => backupService.restore(BrowserWindow.getFocusedWindow())
}
