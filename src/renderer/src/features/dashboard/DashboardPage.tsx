import { PageHeader } from '../../components/PageHeader'
import { useIpcQuery } from '../../lib/ipc'

export function DashboardPage(): React.JSX.Element {
  const { data, error } = useIpcQuery('app:info')

  return (
    <>
      <PageHeader title="Início" subtitle="Resumo da loja" />
      {error && <p className="text-red-600">Erro: {error.message}</p>}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <div className="text-sm text-stone-500">Produtos no estoque</div>
          <div className="mt-2 text-3xl font-semibold">{data?.productCount ?? '–'}</div>
        </div>
      </div>
      {data && (
        <p className="mt-8 text-xs text-stone-400">
          v{data.version} · banco: {data.dbPath}
        </p>
      )}
    </>
  )
}
