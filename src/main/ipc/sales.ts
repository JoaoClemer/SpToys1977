import { customersService, salesService } from '../services/sales'
import type { Handlers } from './types'

export const salesHandlers: Handlers<
  | 'customers:search'
  | 'sales:list'
  | 'sales:get'
  | 'sales:create'
  | 'sales:update'
  | 'sales:cancel'
  | 'sales:markShipped'
  | 'sales:markDelivered'
  | 'sales:reopenDelivery'
> = {
  'customers:search': (query) => customersService.search(query),
  'sales:list': (filters) => salesService.list(filters),
  'sales:get': (id) => salesService.get(id),
  'sales:create': (input) => salesService.create(input),
  'sales:update': (id, input) => salesService.update(id, input),
  'sales:cancel': (id) => salesService.cancel(id),
  'sales:markShipped': (id, input) => salesService.markShipped(id, input),
  'sales:markDelivered': (id, deliveredAt) => salesService.markDelivered(id, deliveredAt),
  'sales:reopenDelivery': (id) => salesService.reopenDelivery(id)
}
