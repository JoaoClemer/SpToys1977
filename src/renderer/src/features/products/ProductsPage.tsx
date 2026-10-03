import { formatCents } from '../../../../shared/money'
import { PageHeader } from '../../components/PageHeader'
import { useIpcQuery } from '../../lib/ipc'

export function ProductsPage(): React.JSX.Element {
  const { data: products = [], isLoading } = useIpcQuery('products:list')

  return (
    <>
      <PageHeader title="Estoque" subtitle="Produtos cadastrados" />
      {!isLoading && products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500">
          Nenhum produto cadastrado ainda.
        </div>
      ) : (
        <table className="w-full overflow-hidden rounded-lg border border-stone-200 bg-white text-sm">
          <thead className="bg-stone-100 text-left text-stone-600">
            <tr>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Categoria</th>
              <th className="px-4 py-2 text-right font-medium">Preço</th>
              <th className="px-4 py-2 text-right font-medium">Qtd.</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-stone-100">
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2 text-stone-500">{p.category ?? '—'}</td>
                <td className="px-4 py-2 text-right">{formatCents(p.originalPrice)}</td>
                <td className="px-4 py-2 text-right">
                  {p.quantity > 0 ? p.quantity : <span className="text-red-600">Vendido</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
