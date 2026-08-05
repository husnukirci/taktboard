import { describe, expect, it } from 'vitest'
import type { Schedule } from '../domain'
import { useScheduleStore } from '../state/scheduleStore'
import { renderWithStores } from '../test/renderWithStores'
import TimelineBoard from './TimelineBoard.vue'

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
      currentStart: '2026-03-04', // 2 days late → warn bar + baseline ghost
      durationDays: 2,
    },
    'task-boarding': {
      id: 'task-boarding',
      tradeId: 'trade-drywall',
      name: 'Boarding',
      baselineStart: '2026-03-06',
      currentStart: '2026-03-06',
      durationDays: 3,
    },
  },
  dependencies: [{ predecessorId: 'task-wiring', successorId: 'task-boarding' }],
}

describe('TimelineBoard', () => {
  it('renders trade lanes and task bars from the loaded schedule', () => {
    const wrapper = renderWithStores(TimelineBoard, () => {
      useScheduleStore().loadScenario(fixture)
    })

    for (const text of ['Electrics', 'Drywall', 'Wiring rough-in', 'Boarding']) {
      expect(wrapper.text()).toContain(text)
    }
  })
})
