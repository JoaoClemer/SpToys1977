import { createHashRouter } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProductDetailPage } from './features/products/ProductDetailPage'
import { ProductsPage } from './features/products/ProductsPage'
import { DeliveriesPage } from './features/sales/DeliveriesPage'
import { SaleDetailPage } from './features/sales/SaleDetailPage'
import { SalesPage } from './features/sales/SalesPage'
import { SettingsPage } from './features/settings/SettingsPage'

// Hash router: o app de produção é carregado via file://
export const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'estoque', element: <ProductsPage /> },
      { path: 'estoque/:id', element: <ProductDetailPage /> },
      { path: 'vendas', element: <SalesPage /> },
      { path: 'vendas/:id', element: <SaleDetailPage /> },
      { path: 'entregas', element: <DeliveriesPage /> },
      { path: 'configuracoes', element: <SettingsPage /> }
    ]
  }
])
