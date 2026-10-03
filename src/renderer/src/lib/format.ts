export { formatCents } from '../../../shared/money'

/** 'YYYY-MM-DD' (ou ISO) -> 'dd/mm/aaaa' */
export function formatDate(s: string | null | undefined): string {
  if (!s) return '—'
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export function todayInput(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Dias corridos desde uma data 'YYYY-MM-DD' */
export function daysSince(s: string): number {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  const then = new Date(y, m - 1, d).getTime()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.round((today - then) / 86_400_000)
}

export function daysAgoLabel(s: string): string {
  const n = daysSince(s)
  if (n <= 0) return 'hoje'
  if (n === 1) return 'ontem'
  return `há ${n} dias`
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MONTHS_LONG = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro'
]

/** 'YYYY-MM' -> 'set' */
export function monthShort(ym: string): string {
  return MONTHS[Number(ym.slice(5, 7)) - 1]
}

/** 'YYYY-MM' -> 'setembro de 2026' */
export function monthLong(ym: string): string {
  return `${MONTHS_LONG[Number(ym.slice(5, 7)) - 1]} de ${ym.slice(0, 4)}`
}

/** Valor compacto para eixos: 1200000 centavos -> 'R$ 12 mil' */
export function compactCents(cents: number): string {
  const reais = cents / 100
  if (reais >= 1_000_000)
    return `R$ ${(reais / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (reais >= 1_000)
    return `R$ ${(reais / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return `R$ ${reais.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

/** Formata telefone BR para exibição (sem validar) */
export function formatPhone(p: string | null): string {
  if (!p) return '—'
  const d = p.replace(/\D/g, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return p
}

export function photoUrl(file: string, size: 'thumb' | 'full' = 'thumb'): string {
  return `app-photo://${size}/${file}`
}
