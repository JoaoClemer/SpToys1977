const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 12345 -> "R$ 123,45" */
export function formatCents(cents: number): string {
  return brl.format(cents / 100)
}

/** "R$ 1.234,56" | "1234,56" | "1234.56" -> 123456. Retorna null se inválido. */
export function parseToCents(input: string): number | null {
  let s = input.replace(/[R$\s]/g, '')
  if (!s) return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  return Math.round(Number(s) * 100)
}
