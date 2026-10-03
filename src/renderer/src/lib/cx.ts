import { twMerge } from 'tailwind-merge'

/** Junta classes; em conflito (ex.: w-full + w-48) a última vence */
export const cx = (...c: (string | false | null | undefined)[]): string =>
  twMerge(c.filter(Boolean).join(' '))
