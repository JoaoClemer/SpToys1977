/** Datas de negócio são guardadas como 'YYYY-MM-DD' no horário local. */
export function todayLocal(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** 'YYYY-MM' de um mês relativo ao atual (0 = atual, -1 = anterior...) */
export function monthKey(offset = 0, base = new Date()): string {
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1)
  return todayLocal(d).slice(0, 7)
}

/** Aceita 'YYYY-MM-DD' ou ISO completo e devolve 'YYYY-MM-DD' */
export function toDateOnly(s: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : todayLocal(new Date(s))
}
