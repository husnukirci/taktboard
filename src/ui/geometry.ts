/**
 * Shared board geometry: every mapping from schedule data to grid columns or
 * pixels lives here, so the HTML grid (Phase 3) and the SVG arrow overlay
 * (Phase 5) can never disagree. Components do no date math of their own —
 * date-derived presentation helpers (weekend tint, header and aria labels)
 * live here too, on top of `domain/dates`.
 */

import { addDays, diffDays, parseISODate } from '../domain'
import type { ISODate, Task } from '../domain'

/** Columns before the first day column: the sticky trade-name column. */
export const TRADE_COLUMN_COUNT = 1

/** Pixel mirrors of the CSS tokens in `globals.css` at the 16px root size. */
export const DAY_WIDTH_PX = 44 // --day-w: 2.75rem
export const LANE_HEIGHT_PX = 64 // --lane-h: 4rem

export interface BoardMetrics {
  dayWidthPx: number
  laneHeightPx: number
}

export const DEFAULT_METRICS: BoardMetrics = {
  dayWidthPx: DAY_WIDTH_PX,
  laneHeightPx: LANE_HEIGHT_PX,
}

/** 1-based day index of `date` within the timeline starting at `rangeStart`. */
export function columnOfDate(rangeStart: ISODate, date: ISODate): number {
  return diffDays(rangeStart, date) + 1
}

/** Absolute CSS grid column of `date`, accounting for the trade column. */
export function gridColumnOfDate(rangeStart: ISODate, date: ISODate): number {
  return columnOfDate(rangeStart, date) + TRADE_COLUMN_COUNT
}

export type BarSchedule = 'current' | 'baseline'

/** `grid-column` value for a task bar, e.g. `"5 / span 3"`. */
export function barGridColumn(
  rangeStart: ISODate,
  task: Task,
  schedule: BarSchedule = 'current',
): string {
  const start = schedule === 'current' ? task.currentStart : task.baselineStart
  return `${gridColumnOfDate(rangeStart, start)} / span ${task.durationDays}`
}

/** Left pixel edge of `date`'s column; x = 0 is the left edge of the first day column. */
export function xOfDate(
  rangeStart: ISODate,
  date: ISODate,
  metrics: BoardMetrics = DEFAULT_METRICS,
): number {
  return (columnOfDate(rangeStart, date) - 1) * metrics.dayWidthPx
}

export interface BarRect {
  x: number
  y: number
  width: number
  height: number
}

/** Pixel rect of a task's current bar cell; `laneIndex` is 0-based from `tasksByTrade`. */
export function barRect(
  rangeStart: ISODate,
  task: Task,
  laneIndex: number,
  metrics: BoardMetrics = DEFAULT_METRICS,
): BarRect {
  return {
    x: xOfDate(rangeStart, task.currentStart, metrics),
    y: laneIndex * metrics.laneHeightPx,
    width: task.durationDays * metrics.dayWidthPx,
    height: metrics.laneHeightPx,
  }
}

/** Saturday or Sunday — visual tint only; the domain stays calendar-day. */
export function isWeekend(date: ISODate): boolean {
  const dow = parseISODate(date).getUTCDay()
  return dow === 0 || dow === 6
}

/** Day-of-month for header labels, without a leading zero. */
export function dayOfMonth(date: ISODate): number {
  return Number(date.slice(8, 10))
}

const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTH_SHORT = MONTH_LONG.map((m) => m.slice(0, 3))

function monthIndex(date: ISODate): number {
  return Number(date.slice(5, 7)) - 1
}

export interface MonthSpan {
  /** YYYY-MM, stable key for rendering. */
  month: string
  label: string
  gridColumnStart: number
  span: number
}

/** Contiguous month groups over the header's day list, as grid column spans. */
export function monthSpans(days: ISODate[]): MonthSpan[] {
  const spans: MonthSpan[] = []
  days.forEach((day, index) => {
    const month = day.slice(0, 7)
    const last = spans.at(-1)
    if (last !== undefined && last.month === month) {
      last.span += 1
      return
    }
    spans.push({
      month,
      label: `${MONTH_LONG[monthIndex(day)]} ${day.slice(0, 4)}`,
      gridColumnStart: index + 1 + TRADE_COLUMN_COUNT,
      span: 1,
    })
  })
  return spans
}

/** Human date range for aria labels: "12–15 Aug", "30 Mar – 2 Apr", or "12 Aug". */
export function formatDayRange(start: ISODate, durationDays: number): string {
  const end = addDays(start, durationDays - 1)
  const startMonth = MONTH_SHORT[monthIndex(start)]
  if (start === end) {
    return `${dayOfMonth(start)} ${startMonth}`
  }
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return `${dayOfMonth(start)}–${dayOfMonth(end)} ${startMonth}`
  }
  return `${dayOfMonth(start)} ${startMonth} – ${dayOfMonth(end)} ${MONTH_SHORT[monthIndex(end)]}`
}
