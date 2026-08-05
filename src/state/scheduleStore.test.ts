import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Schedule } from '../domain'
import { useScheduleStore } from './scheduleStore'

/** Two tasks in one trade, A → B with zero slack: moving A must push B. */
function fixture(): Schedule {
  return {
    trades: { 'trade-shell': { id: 'trade-shell', name: 'Shell', order: 1 } },
    tasks: {
      a: {
        id: 'a',
        tradeId: 'trade-shell',
        name: 'Task A',
        baselineStart: '2026-03-02',
        currentStart: '2026-03-02',
        durationDays: 2,
      },
      b: {
        id: 'b',
        tradeId: 'trade-shell',
        name: 'Task B',
        baselineStart: '2026-03-04',
        currentStart: '2026-03-04',
        durationDays: 2,
      },
    },
    dependencies: [{ predecessorId: 'a', successorId: 'b' }],
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('useScheduleStore', () => {
  it('starts empty and loadScenario replaces the schedule', () => {
    const store = useScheduleStore()
    expect(store.schedule).toBeNull()

    store.loadScenario(fixture())

    expect(store.schedule?.tasks['a']?.name).toBe('Task A')
    expect(store.lastChangedIds).toEqual([])
  })

  it('moveTask delegates to domain propagation and records the changed ids', () => {
    const store = useScheduleStore()
    store.loadScenario(fixture())

    store.moveTask('a', '2026-03-04')

    expect(store.schedule?.tasks['a']?.currentStart).toBe('2026-03-04')
    expect(store.schedule?.tasks['b']?.currentStart).toBe('2026-03-06')
    expect(store.lastChangedIds).toEqual(['a', 'b'])
  })

  it('moveTask throws before a scenario is loaded', () => {
    const store = useScheduleStore()

    expect(() => store.moveTask('a', '2026-03-04')).toThrowError(/no schedule loaded/)
  })

  it('reset restores every currentStart to baselineStart and clears lastChangedIds', () => {
    const store = useScheduleStore()
    store.loadScenario(fixture())
    store.moveTask('a', '2026-03-04')

    store.reset()

    expect(store.schedule?.tasks['a']?.currentStart).toBe('2026-03-02')
    expect(store.schedule?.tasks['b']?.currentStart).toBe('2026-03-04')
    expect(store.lastChangedIds).toEqual([])
  })

  describe('getters', () => {
    it('are empty before a scenario is loaded', () => {
      const store = useScheduleStore()

      expect(store.tasksByTrade).toEqual([])
      expect(store.dateRange).toBeNull()
      expect(() => store.delayOf('a')).toThrowError(/no schedule loaded/)
    })

    it('delegate to the domain selectors once loaded', () => {
      const store = useScheduleStore()
      store.loadScenario(fixture())
      store.moveTask('a', '2026-03-04')

      expect(store.tasksByTrade.map((lane) => lane.trade.id)).toEqual(['trade-shell'])
      expect(store.tasksByTrade[0]?.tasks.map((t) => t.id)).toEqual(['a', 'b'])
      expect(store.dateRange).toEqual({ start: '2026-03-02', end: '2026-03-08' })
      expect(store.delayOf('a')).toBe(2)
      expect(store.delayOf('b')).toBe(2)
    })
  })
})
