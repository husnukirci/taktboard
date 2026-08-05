import { describe, expect, it } from 'vitest'
import { dateRange, delayOf, tasksByTrade } from './selectors'
import type { Schedule, Task } from './types'

function task(id: string, overrides: Partial<Task>): Task {
  return {
    id,
    tradeId: 'elec',
    name: id,
    baselineStart: '2026-01-05',
    currentStart: '2026-01-05',
    durationDays: 2,
    ...overrides,
  }
}

function fixture(): Schedule {
  return {
    trades: {
      dry: { id: 'dry', name: 'Drywall', order: 2 },
      elec: { id: 'elec', name: 'Electrics', order: 1 },
      paint: { id: 'paint', name: 'Painting', order: 3 },
    },
    tasks: {
      late: task('late', { baselineStart: '2026-01-05', currentStart: '2026-01-08' }),
      early: task('early', { baselineStart: '2026-01-12', currentStart: '2026-01-10' }),
      boarding: task('boarding', {
        tradeId: 'dry',
        baselineStart: '2026-01-14',
        currentStart: '2026-01-14',
        durationDays: 4, // current end 2026-01-18 is the latest date in play
      }),
    },
    dependencies: [],
  }
}

describe('delayOf', () => {
  it('is positive for a task running late', () => {
    expect(delayOf(fixture(), 'late')).toBe(3)
  })

  it('is negative for a task pulled earlier', () => {
    expect(delayOf(fixture(), 'early')).toBe(-2)
  })

  it('is zero for a task on baseline', () => {
    expect(delayOf(fixture(), 'boarding')).toBe(0)
  })

  it('throws on an unknown task id, naming it', () => {
    expect(() => delayOf(fixture(), 'ghost')).toThrow(/"ghost"/)
  })
})

describe('dateRange', () => {
  it('spans min start to max end across baseline and current', () => {
    // Earliest start: late's baseline 01-05. Latest end: boarding 01-14 + 4 = 01-18.
    expect(dateRange(fixture())).toEqual({ start: '2026-01-05', end: '2026-01-18' })
  })

  it('counts a baseline end that outlives every current end', () => {
    const s: Schedule = {
      trades: { elec: { id: 'elec', name: 'Electrics', order: 1 } },
      tasks: {
        pulled: task('pulled', {
          baselineStart: '2026-01-20',
          currentStart: '2026-01-06',
          durationDays: 2,
        }),
      },
      dependencies: [],
    }
    // Baseline run 01-20..01-22 ends later than current 01-06..01-08.
    expect(dateRange(s)).toEqual({ start: '2026-01-06', end: '2026-01-22' })
  })

  it('throws on a schedule with no tasks', () => {
    const s: Schedule = { trades: {}, tasks: {}, dependencies: [] }
    expect(() => dateRange(s)).toThrow(/no tasks/i)
  })
})

describe('tasksByTrade', () => {
  it('orders lanes by trade order and tasks by currentStart', () => {
    const lanes = tasksByTrade(fixture())
    expect(lanes.map((l) => l.trade.id)).toEqual(['elec', 'dry', 'paint'])
    expect(lanes[0]?.tasks.map((t) => t.id)).toEqual(['late', 'early'])
  })

  it('includes an empty lane for a trade with no tasks', () => {
    const lanes = tasksByTrade(fixture())
    expect(lanes[2]).toEqual({ trade: { id: 'paint', name: 'Painting', order: 3 }, tasks: [] })
  })
})
