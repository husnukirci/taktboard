import { describe, expect, it } from 'vitest'
import type { Schedule } from '../domain'
import { useScheduleStore } from '../state/scheduleStore'
import { renderWithStores } from '../test/renderWithStores'
import DependencyLayer from './DependencyLayer.vue'

const fixture: Schedule = {
  trades: {
    'trade-electrics': { id: 'trade-electrics', name: 'Electrics', order: 1 },
    'trade-drywall': { id: 'trade-drywall', name: 'Drywall', order: 2 },
  },
  tasks: {
    'task-wiring': {
      id: 'task-wiring',
      tradeId: 'trade-electrics',
      name: 'Wiring rough-in',
      baselineStart: '2026-03-02',
      currentStart: '2026-03-02',
      durationDays: 2,
    },
    'task-boarding': {
      id: 'task-boarding',
      tradeId: 'trade-drywall',
      name: 'Boarding',
      baselineStart: '2026-03-05',
      currentStart: '2026-03-05',
      durationDays: 3,
    },
  },
  dependencies: [{ predecessorId: 'task-wiring', successorId: 'task-boarding' }],
}

describe('DependencyLayer', () => {
  it('draws one arrow per dependency from store geometry', () => {
    const wrapper = renderWithStores(DependencyLayer, () => {
      useScheduleStore().loadScenario(fixture)
    })

    const paths = wrapper.findAll('path[marker-end]')
    expect(paths).toHaveLength(1)
    // Wiring ends day 2 of the range (x=88, lane 0); boarding starts day 4 (x=132, lane 1).
    expect(paths[0]?.attributes('d')).toBe('M 88 32 C 110 32, 110 96, 132 96')
  })
})
