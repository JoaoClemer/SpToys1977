import type { IpcApi } from '../../shared/api'
import { productRepository } from '../repositories/products'

export const productHandlers: Pick<IpcApi, 'products:list'> = {
  'products:list': () => productRepository.list()
}
