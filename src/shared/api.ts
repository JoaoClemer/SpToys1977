/**
 * Contrato da API IPC entre renderer e main.
 * Cada chave é um canal `ipcMain.handle`; o preload expõe um invoke tipado.
 */
import type {
  DeliveryMethod,
  DeliveryStatus,
  MarkShippedInput,
  ProductFilters,
  ProductInput,
  ProductPrivateInput,
  SaleFilters,
  SaleInput,
  SaleUpdate
} from './schemas'

export interface AppInfo {
  version: string
  dataPath: string
  dbPath: string
}

export interface ProductListItem {
  id: number
  name: string
  category: string | null
  originalPrice: number
  quantity: number
  archived: boolean
  coverPhoto: string | null
  photoCount: number
  soldUnits: number
  createdAt: string
}

export interface ProductDetail {
  id: number
  name: string
  description: string | null
  category: string | null
  originalPrice: number
  quantity: number
  archived: boolean
  photos: string[]
  createdAt: string
  updatedAt: string
  sales: SaleListItem[]
}

export interface Customer {
  id: number
  name: string
  phone: string | null
  address: string | null
  purchases: number
}

export interface SaleListItem {
  id: number
  productId: number
  productName: string
  productPhoto: string | null
  quantity: number
  unitPrice: number
  total: number
  shippingCost: number | null
  soldAt: string
  buyerName: string
  buyerAddress: string | null
  buyerPhone: string | null
  deliveryMethod: DeliveryMethod
  deliveryStatus: DeliveryStatus
  trackingCode: string | null
  shippedAt: string | null
  deliveredAt: string | null
  canceledAt: string | null
  notes: string | null
}

export interface MonthlyRevenue {
  /** YYYY-MM */
  month: string
  revenue: number
  sales: number
}

export interface CategoryStat {
  category: string
  revenue: number
  units: number
}

export interface DashboardSummary {
  stock: {
    products: number
    units: number
    value: number
    soldOut: number
  }
  month: {
    revenue: number
    sales: number
    units: number
    shipping: number
    avgTicket: number
    prevRevenue: number
  }
  year: { revenue: number; sales: number }
  deliveries: {
    awaitingShipment: SaleListItem[]
    inTransit: SaleListItem[]
    awaitingPickup: SaleListItem[]
  }
  recentSales: SaleListItem[]
  monthly: MonthlyRevenue[]
  topCategories: CategoryStat[]
  staleProducts: ProductListItem[]
  recentProducts: ProductListItem[]
}

export interface AdminStatus {
  hasPassword: boolean
  unlocked: boolean
  /** Epoch ms em que o desbloqueio expira */
  expiresAt: number | null
}

export interface ProductPrivate {
  purchasePrice: number | null
  negotiationLimit: number | null
  privateNotes: string | null
}

export interface BackupResult {
  path: string
  sizeBytes: number
}

export interface IpcApi {
  'app:info': () => AppInfo
  'app:openDataFolder': () => void
  'app:openExternal': (url: string) => void

  'products:list': (filters?: ProductFilters) => ProductListItem[]
  'products:get': (id: number) => ProductDetail
  'products:create': (input: ProductInput) => ProductDetail
  'products:update': (id: number, input: ProductInput) => ProductDetail
  'products:setArchived': (id: number, archived: boolean) => void
  'products:delete': (id: number) => void
  'products:categories': () => string[]
  /** Exigem a senha de administrador desbloqueada */
  'products:getPrivate': (id: number) => ProductPrivate
  'products:setPrivate': (id: number, input: ProductPrivateInput) => ProductPrivate

  'auth:status': () => AdminStatus
  /** Cria a senha (current = null) ou altera (exige a atual) */
  'auth:setPassword': (current: string | null, next: string) => AdminStatus
  'auth:unlock': (password: string) => AdminStatus
  'auth:lock': () => AdminStatus

  /** Abre o seletor de arquivos e importa as fotos escolhidas */
  'photos:pick': () => string[]
  /** Importa fotos a partir de caminhos locais (arrastar e soltar) */
  'photos:import': (paths: string[]) => string[]

  'customers:search': (query: string) => Customer[]

  'sales:list': (filters?: SaleFilters) => SaleListItem[]
  'sales:get': (id: number) => SaleListItem
  'sales:create': (input: SaleInput) => SaleListItem
  'sales:update': (id: number, input: SaleUpdate) => SaleListItem
  'sales:cancel': (id: number) => SaleListItem
  'sales:markShipped': (id: number, input: MarkShippedInput) => SaleListItem
  'sales:markDelivered': (id: number, deliveredAt: string) => SaleListItem
  'sales:reopenDelivery': (id: number) => SaleListItem

  'dashboard:summary': () => DashboardSummary

  'backup:create': () => BackupResult | null
  'backup:restore': () => boolean
}

export type IpcChannel = keyof IpcApi

export type IpcArgs<C extends IpcChannel> = Parameters<IpcApi[C]>
export type IpcResult<C extends IpcChannel> = Awaited<ReturnType<IpcApi[C]>>

/** Resposta serializada: erros de negócio viajam como dados, não como exceções do Electron. */
export type IpcResponse<T> = { ok: true; data: T } | { ok: false; error: string }

export interface RendererApi {
  invoke<C extends IpcChannel>(channel: C, ...args: IpcArgs<C>): Promise<IpcResult<C>>
  /** Caminho local de um File arrastado para a janela */
  getPathForFile(file: File): string
}
