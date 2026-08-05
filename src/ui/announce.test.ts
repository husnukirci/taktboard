import { describe, expect, it } from 'vitest'
import type { Schedule } from '../domain'
import { moveAnnouncement } from './announce'

const schedule: Schedule = {
  trades: { 'trade-a': { id: 'trade-a', name: 'Drywall', order: 1 } },
  tasks: {
    'task-a': {
      id: 'task-a',
      tradeId: 'trade-a',
      name: 'Boarding & closing',
      baselineStart: '2026-08-12',
      currentStart: '2026-08-14',
      durationDays: 2,
    },
    'task-b': {
      id: 'task-b',
      tradeId: 'trade-a',
      name: 'Taping',
      baselineStart: '2026-08-16',
      currentStart: '2026-08-16',
      durationDays: 1,
    },
    'task-c': {
      id: 'task-c',
      tradeId: 'trade-a',
      name: 'Skim coat',
      baselineStart: '2026-08-17',
      currentStart: '2026-08-17',
      durationDays: 1,
    },
  },
  dependencies: [],
}

describe('moveAnnouncement', () => {
  it('names the moved task, its new date, and the ripple size', () => {
    expect(moveAnnouncement(schedule, ['task-a', 'task-b', 'task-c'])).toBe(
      'Boarding & closing moved to 14 Aug; 2 tasks rescheduled.',
    )
  })

  it('uses singular wording for one pushed task', () => {
    expect(moveAnnouncement(schedule, ['task-a', 'task-b'])).toBe(
      'Boarding & closing moved to 14 Aug; 1 task rescheduled.',
    )
  })

  it('says so when nothing else moved', () => {
    expect(moveAnnouncement(schedule, ['task-a'])).toBe(
      'Boarding & closing moved to 14 Aug; no other tasks rescheduled.',
    )
  })

  it('returns null when there is nothing to announce', () => {
    expect(moveAnnouncement(schedule, [])).toBeNull()
    expect(moveAnnouncement(schedule, ['task-unknown'])).toBeNull()
  })
})
