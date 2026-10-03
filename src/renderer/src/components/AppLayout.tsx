import { NavLink, Outlet } from 'react-router'

const NAV = [
  { to: '/', label: 'Início', end: true },
  { to: '/estoque', label: 'Estoque' },
  { to: '/vendas', label: 'Vendas' },
  { to: '/entregas', label: 'Entregas' },
  { to: '/configuracoes', label: 'Configurações' }
]

export function AppLayout(): React.JSX.Element {
  return (
    <div className="flex h-full">
      <aside className="flex w-56 shrink-0 flex-col border-r border-stone-200 bg-brand-900 text-brand-50">
        <div className="px-5 py-6">
          <div className="text-lg font-semibold tracking-wide">SpToys 1977</div>
          <div className="text-xs text-brand-100/70">Antiguidades</div>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive ? 'bg-brand-500 text-white' : 'text-brand-100 hover:bg-white/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}
