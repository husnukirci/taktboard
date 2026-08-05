import { describe, expect, it } from 'vitest'
import type { Task } from '../domain'
import {
  barGridColumn,
  barRect,
  columnOfDate,
  dayOfMonth,
  formatDayRange,
  gridColumnOfDate,
  isWeekend,
  monthSpans,
  xOfDate,
} from './geometry'

const task: Task = {
  id: 'task-a',
  tradeId: 'trade-a',
  name: 'Task A',
  baselineStart: '2026-03-04',
  currentStart: '2026-03-06',
  durationDays: 3,
}

describe('columnOfDate', () => {
  it('is 1-based at the range start', () => {
    expect(columnOfDate('2026-03-02', '2026-03-02')).toBe(1)
    expect(columnOfDate('2026-03-02', '2026-03-06')).toBe(5)
  })
})

describe('gridColumnOfDate', () => {
  it('shifts past the trade column', () => {
    expect(gridColumnOfDate('2026-03-02', '2026-03-02')).toBe(2)
  })
})

describe('barGridColumn', () => {
  it('places the current bar with its duration as span', () => {
    expect(barGridColumn('2026-03-02', task)).toBe('6 / span 3')
  })

  it('places the baseline ghost at the baseline start', () => {
    expect(barGridColumn('2026-03-02', task, 'baseline')).toBe('4 / span 3')
  })
})

describe('pixel helpers', () => {
  it('xOfDate maps the range start to 0 and scales by day width', () => {
    expect(xOfDate('2026-03-02', '2026-03-02')).toBe(0)
    expect(xOfDate('2026-03-02', '2026-03-06', { dayWidthPx: 10, laneHeightPx: 20 })).toBe(40)
  })

  it('barRect covers the bar cell in its lane', () => {
    expect(barRect('2026-03-02', task, 2, { dayWidthPx: 10, laneHeightPx: 20 })).toEqual({
      x: 40,
      y: 40,
      width: 30,
      height: 20,
    })
  })
})

describe('isWeekend', () => {
  it('tints Saturday and Sunday only', () => {
    expect(isWeekend('2026-03-06')).toBe(false) // Friday
    expect(isWeekend('2026-03-07')).toBe(true) // Saturday
    expect(isWeekend('2026-03-08')).toBe(true) // Sunday
    expect(isWeekend('2026-03-09')).toBe(false) // Monday
  })
})

describe('header labels', () => {
  it('dayOfMonth drops the leading zero', () => {
    expect(dayOfMonth('2026-03-06')).toBe(6)
    expect(dayOfMonth('2026-03-28')).toBe(28)
  })

  it('monthSpans groups contiguous days per month with grid placement', () => {
    const days = ['2026-03-30', '2026-03-31', '2026-04-01']
    expect(monthSpans(days)).toEqual([
      { month: '2026-03', label: 'March 2026', gridColumnStart: 2, span: 2 },
      { month: '2026-04', label: 'April 2026', gridColumnStart: 4, span: 1 },
    ])
  })
})

describe('formatDayRange', () => {
  it('renders a same-month range compactly', () => {
    expect(formatDayRange('2026-08-12', 4)).toBe('12–15 Aug')
  })

  it('renders a cross-month range with both months', () => {
    expect(formatDayRange('2026-03-30', 4)).toBe('30 Mar – 2 Apr')
  })

  it('renders a single day without a dash', () => {
    expect(formatDayRange('2026-08-12', 1)).toBe('12 Aug')
  })
})
