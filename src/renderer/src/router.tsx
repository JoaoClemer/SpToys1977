import { createHashRouter } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { ProductsPage } from './features/products/ProductsPage'
import { SalesPage } from './features/sales/SalesPage'
import { DeliveriesPage } from './features/sales/DeliveriesPage'
import { SettingsPage } from './features/settings/SettingsPage'

// Hash router: o app de produção é carregado via file://
export const router = createHashRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'estoque', element: <ProductsPage /> },
      { path: 'vendas', element: <SalesPage /> },
      { path: 'entregas', element: <DeliveriesPage /> },
      { path: 'configuracoes', element: <SettingsPage /> }
    ]
  }
])
