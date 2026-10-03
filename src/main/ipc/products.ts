import { BrowserWindow, dialog } from 'electron'
import { deletePhotoFiles, importPhotos } from '../services/photos'
import { productsService } from '../services/products'
import type { Handlers } from './types'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'tif', 'tiff', 'avif', 'heic']

export const productHandlers: Handlers<
  | 'products:list'
  | 'products:get'
  | 'products:create'
  | 'products:update'
  | 'products:setArchived'
  | 'products:delete'
  | 'products:categories'
  | 'photos:pick'
  | 'photos:import'
> = {
  'products:list': (filters) => productsService.list(filters),
  'products:get': (id) => productsService.get(id),
  'products:create': (input) => productsService.create(input),
  'products:update': (id, input) => {
    const { product, removedPhotos } = productsService.update(id, input)
    deletePhotoFiles(removedPhotos)
    return product
  },
  'products:setArchived': (id, archived) => productsService.setArchived(id, archived),
  'products:delete': (id) => deletePhotoFiles(productsService.delete(id)),
  'products:categories': () => productsService.categories(),

  'photos:pick': async () => {
    const opts = {
      title: 'Adicionar fotos',
      properties: ['openFile' as const, 'multiSelections' as const],
      filters: [{ name: 'Imagens', extensions: IMAGE_EXTENSIONS }]
    }
    const win = BrowserWindow.getFocusedWindow()
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    return res.canceled ? [] : importPhotos(res.filePaths)
  },
  'photos:import': (paths) => importPhotos(paths)
}
