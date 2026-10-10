import { authService } from '../services/auth'
import { productsService } from '../services/products'
import type { Handlers } from './types'

export const authHandlers: Handlers<
  | 'auth:status'
  | 'auth:setPassword'
  | 'auth:unlock'
  | 'auth:lock'
  | 'products:getPrivate'
  | 'products:setPrivate'
> = {
  'auth:status': () => authService.status(),
  'auth:setPassword': (current, next) => authService.setPassword(current, next),
  'auth:unlock': (password) => authService.unlock(password),
  'auth:lock': () => authService.lock(),
  'products:getPrivate': (id) => productsService.getPrivate(id),
  'products:setPrivate': (id, input) => productsService.setPrivate(id, input)
}
