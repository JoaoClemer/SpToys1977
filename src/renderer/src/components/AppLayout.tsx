import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Toaster } from 'sonner'
import { LayoutDashboard, Package, Receipt, Settings, Truck } from 'lucide-react'
import { useIpcQuery } from '../lib/ipc'

export function AppLayout(): React.JSX.Element {
  const { data } = useIpcQuery('dashboard:summary')
  const pending = data
    ? data.deliveries.awaitingShipment.length +
      data.deliveries.inTransit.length +
      data.deliveries.awaitingPickup.length
    : 0

  const nav = [
    { to: '/', label: 'Início', end: true, Icon: LayoutDashboard },
    { to: '/estoque', label: 'Estoque', Icon: Package },
    { to: '/vendas', label: 'Vendas', Icon: Receipt },
    { to: '/entregas', label: 'Entregas', Icon: Truck, count: pending },
    { to: '/configuracoes', label: 'Configurações', Icon: Settings }
  ]

  // Volta ao topo ao trocar de página
  const mainRef = useRef<HTMLElement>(null)
  const { pathname } = useLocation()
  useEffect(() => mainRef.current?.scrollTo(0, 0), [pathname])

  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col bg-brand-900 text-brand-50">
        <div className="px-5 py-6">
          <div className="text-lg font-semibold tracking-wide">SpToys 1977</div>
          <div className="text-xs text-brand-100/70">Antiguidades</div>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {nav.map(({ to, label, end, Icon, count }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-brand-500 text-white' : 'text-brand-100 hover:bg-white/10'
                }`
              }
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {!!count && (
                <span className="tabular rounded-full bg-amber-400 px-1.5 text-xs font-semibold text-brand-900">
                  {count}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-8">
          <Outlet />
        </div>
      </main>
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  )
}
