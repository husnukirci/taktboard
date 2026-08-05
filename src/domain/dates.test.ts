import { describe, expect, it } from 'vitest'
import { addDays, diffDays, eachDay, maxDate, parseISODate } from './dates'

describe('parseISODate', () => {
  it('parses a valid ISO date as UTC midnight', () => {
    const d = parseISODate('2024-03-05')
    expect(d.toISOString()).toBe('2024-03-05T00:00:00.000Z')
  })

  it.each(['2024/03/05', '24-03-05', '2024-3-5', 'garbage', '', '2024-03-05T10:00:00Z'])(
    'throws on malformed input %j',
    (input) => {
      expect(() => parseISODate(input)).toThrow(/invalid iso date/i)
    },
  )

  it.each(['2024-13-01', '2024-00-10', '2024-02-30', '2023-02-29', '2024-04-31'])(
    'throws on impossible calendar date %j',
    (input) => {
      expect(() => parseISODate(input)).toThrow(/invalid iso date/i)
    },
  )

  it('accepts a leap-day in a leap year', () => {
    expect(parseISODate('2024-02-29').toISOString()).toBe('2024-02-29T00:00:00.000Z')
  })
})

describe('addDays', () => {
  it('adds days within a month', () => {
    expect(addDays('2024-03-05', 3)).toBe('2024-03-08')
  })

  it('crosses a month boundary', () => {
    expect(addDays('2024-01-31', 1)).toBe('2024-02-01')
  })

  it('crosses a year boundary', () => {
    expect(addDays('2024-12-30', 5)).toBe('2025-01-04')
  })

  it('lands on a leap day', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
  })

  it('accepts negative offsets', () => {
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29')
  })

  it('returns the same date for zero', () => {
    expect(addDays('2024-03-05', 0)).toBe('2024-03-05')
  })

  it('rejects fractional offsets', () => {
    expect(() => addDays('2024-03-05', 1.5)).toThrow(/integer/i)
  })
})

describe('diffDays', () => {
  it('counts days from the first date to the second', () => {
    expect(diffDays('2024-03-05', '2024-03-08')).toBe(3)
  })

  it('is negative when the second date is earlier', () => {
    expect(diffDays('2024-03-08', '2024-03-05')).toBe(-3)
  })

  it('is zero for the same date', () => {
    expect(diffDays('2024-03-05', '2024-03-05')).toBe(0)
  })

  it('counts across month and year boundaries', () => {
    expect(diffDays('2024-12-30', '2025-01-04')).toBe(5)
  })

  it('counts across a leap day', () => {
    expect(diffDays('2024-02-28', '2024-03-01')).toBe(2)
  })
})

describe('eachDay', () => {
  it('lists every day from start to end inclusive', () => {
    expect(eachDay('2024-01-30', '2024-02-02')).toEqual([
      '2024-01-30',
      '2024-01-31',
      '2024-02-01',
      '2024-02-02',
    ])
  })

  it('returns a single day when from equals to', () => {
    expect(eachDay('2024-03-05', '2024-03-05')).toEqual(['2024-03-05'])
  })

  it('throws when the range is inverted', () => {
    expect(() => eachDay('2024-03-05', '2024-03-04')).toThrow(/before/i)
  })
})

describe('maxDate', () => {
  it('returns the latest of the given dates', () => {
    expect(maxDate('2024-03-05', '2024-12-01', '2024-07-20')).toBe('2024-12-01')
  })

  it('returns the single date when given one', () => {
    expect(maxDate('2024-03-05')).toBe('2024-03-05')
  })

  it('rejects malformed dates', () => {
    expect(() => maxDate('2024-03-05', 'garbage')).toThrow(/invalid iso date/i)
  })

  it('rejects a malformed date even when it is the only argument', () => {
    expect(() => maxDate('garbage')).toThrow(/invalid iso date/i)
  })
})
