import { app } from 'electron'
import type { IpcApi } from '../../shared/api'
import { getDbPath } from '../db/client'
import { productRepository } from '../repositories/products'

export const appHandlers: Pick<IpcApi, 'app:info'> = {
  'app:info': () => ({
    version: app.getVersion(),
    dbPath: getDbPath(),
    productCount: productRepository.count()
  })
}
