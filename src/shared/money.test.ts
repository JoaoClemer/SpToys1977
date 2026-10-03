import { describe, expect, it } from 'vitest'
import { formatCents, parseToCents } from './money'

describe('parseToCents', () => {
  it.each([
    ['R$ 1.234,56', 123456],
    ['1234,5', 123450],
    ['1234.56', 123456],
    ['10', 1000],
    ['0,99', 99]
  ])('%s -> %i', (input, expected) => {
    expect(parseToCents(input)).toBe(expected)
  })

  it.each(['', 'abc', '1,234', '12.345,678'])('rejeita "%s"', (input) => {
    expect(parseToCents(input)).toBeNull()
  })
})

describe('formatCents', () => {
  it('formata em BRL', () => {
    expect(formatCents(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56')
  })
})
