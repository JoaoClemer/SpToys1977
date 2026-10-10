import type { ProductPrivate } from '../../../../shared/api'
import { Field, MoneyInput, Textarea } from '../../components/ui'

/** Os três campos restritos do produto */
export function PrivateFields({
  value,
  onChange
}: {
  value: ProductPrivate
  onChange: (v: ProductPrivate) => void
}): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Preço de compra" hint="(opcional)">
          <MoneyInput
            value={value.purchasePrice}
            onChange={(purchasePrice) => onChange({ ...value, purchasePrice })}
          />
        </Field>
        <Field label="Preço máximo de negociação" hint="(opcional)">
          <MoneyInput
            value={value.negotiationLimit}
            onChange={(negotiationLimit) => onChange({ ...value, negotiationLimit })}
          />
        </Field>
      </div>
      <Field label="Observações internas" hint="(opcional)">
        <Textarea
          rows={2}
          placeholder="Onde/de quem foi comprado, estado real, combinações com fornecedor…"
          value={value.privateNotes ?? ''}
          onChange={(e) => onChange({ ...value, privateNotes: e.target.value })}
        />
      </Field>
    </div>
  )
}
