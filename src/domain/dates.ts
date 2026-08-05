/**
 * All date math for the domain. Day-granular ISO strings (YYYY-MM-DD) at the
 * boundary, UTC-only `Date` internally. No `Date` arithmetic outside this file.
 */

import type { ISODate } from './types'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Parse a YYYY-MM-DD string to UTC midnight. Throws on malformed or impossible dates. */
export function parseISODate(value: string): Date {
  const match = ISO_DATE_PATTERN.exec(value)
  if (!match) {
    throw new Error(`Invalid ISO date: ${JSON.stringify(value)} (expected YYYY-MM-DD)`)
  }
  const [, year, month, day] = match
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)))
  // Date.UTC silently rolls over impossible dates (2024-02-30 → March 1);
  // round-tripping catches that.
  if (date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid ISO date: ${JSON.stringify(value)} (no such calendar day)`)
  }
  return date
}

function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10)
}

/** Add a whole number of calendar days (may be negative). */
export function addDays(date: ISODate, days: number): ISODate {
  if (!Number.isInteger(days)) {
    throw new Error(`addDays: days must be an integer, got ${days}`)
  }
  const d = parseISODate(date)
  d.setUTCDate(d.getUTCDate() + days)
  return toISODate(d)
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Days from `from` to `to`; negative when `to` is earlier. */
export function diffDays(from: ISODate, to: ISODate): number {
  return (parseISODate(to).getTime() - parseISODate(from).getTime()) / MS_PER_DAY
}

/** Every day from `from` to `to`, both inclusive. */
export function eachDay(from: ISODate, to: ISODate): ISODate[] {
  const span = diffDays(from, to)
  if (span < 0) {
    throw new Error(`eachDay: invalid range — to ${to} is before from ${from}`)
  }
  const days: ISODate[] = []
  for (let i = 0; i <= span; i++) {
    days.push(addDays(from, i))
  }
  return days
}

/** Latest of the given dates. */
export function maxDate(first: ISODate, ...rest: ISODate[]): ISODate {
  const dates = [first, ...rest]
  for (const d of dates) parseISODate(d)
  // Valid YYYY-MM-DD strings order lexicographically.
  return dates.reduce((max, d) => (d > max ? d : max))
}
