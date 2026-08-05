import { describe, expect, it } from 'vitest'
import { moveTask } from './propagate'
import type { Dependency, Schedule, Task } from './types'

function task(id: string, currentStart: string, durationDays: number): Task {
  return {
    id,
    tradeId: 'elec',
    name: id,
    baselineStart: currentStart,
    currentStart,
    durationDays,
  }
}

function schedule(tasks: Task[], dependencies: Dependency[]): Schedule {
  return {
    trades: { elec: { id: 'elec', name: 'Electrics', order: 1 } },
    tasks: Object.fromEntries(tasks.map((t) => [t.id, t])),
    dependencies,
  }
}

function dep(predecessorId: string, successorId: string): Dependency {
  return { predecessorId, successorId }
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

describe('moveTask', () => {
  it('sets the moved task currentStart and reports it changed', () => {
    const s = schedule([task('a', '2026-01-05', 3)], [])
    const result = moveTask(s, 'a', '2026-01-07')
    expect(result.schedule.tasks.a?.currentStart).toBe('2026-01-07')
    expect(result.changedIds).toEqual(['a'])
  })

  it('pushes a single successor that would now start too early', () => {
    // a: 5..8 (end exclusive), b starts on 8. Move a to 7 → a ends 10 → b pushed to 10.
    const s = schedule([task('a', '2026-01-05', 3), task('b', '2026-01-08', 2)], [dep('a', 'b')])
    const result = moveTask(s, 'a', '2026-01-07')
    expect(result.schedule.tasks.b?.currentStart).toBe('2026-01-10')
    expect(result.changedIds).toEqual(['a', 'b'])
  })

  it('lets a successor start exactly on its predecessor end (exclusive end)', () => {
    const s = schedule([task('a', '2026-01-05', 3), task('b', '2026-01-09', 2)], [dep('a', 'b')])
    // Move a to 6 → a ends 9; b already starts on 9, so nothing to push.
    const result = moveTask(s, 'a', '2026-01-06')
    expect(result.schedule.tasks.b?.currentStart).toBe('2026-01-09')
    expect(result.changedIds).toEqual(['a'])
  })

  it('cascades through a chain of three', () => {
    const s = schedule(
      [task('a', '2026-01-05', 2), task('b', '2026-01-07', 2), task('c', '2026-01-09', 2)],
      [dep('a', 'b'), dep('b', 'c')],
    )
    const result = moveTask(s, 'a', '2026-01-08')
    expect(result.schedule.tasks.b?.currentStart).toBe('2026-01-10')
    expect(result.schedule.tasks.c?.currentStart).toBe('2026-01-12')
    expect(result.changedIds).toEqual(['a', 'b', 'c'])
  })

  it('diamond: the successor obeys the later predecessor', () => {
    // a → b and a → c, both → d. Moving a pushes b and c; d obeys whichever ends later.
    const s = schedule(
      [
        task('a', '2026-01-05', 1),
        task('b', '2026-01-06', 3), // ends 09
        task('c', '2026-01-06', 1), // ends 07
        task('d', '2026-01-09', 2),
      ],
      [dep('a', 'b'), dep('a', 'c'), dep('b', 'd'), dep('c', 'd')],
    )
    const result = moveTask(s, 'a', '2026-01-07')
    // a ends 08 → b: 08..11, c: 08..09 → d must wait for b's end 11, not c's 09.
    expect(result.schedule.tasks.d?.currentStart).toBe('2026-01-11')
    expect(result.changedIds).toEqual(['a', 'b', 'c', 'd'])
  })

  it('moving a task earlier pulls nothing', () => {
    const s = schedule([task('a', '2026-01-05', 3), task('b', '2026-01-08', 2)], [dep('a', 'b')])
    const result = moveTask(s, 'a', '2026-01-02')
    expect(result.schedule.tasks.a?.currentStart).toBe('2026-01-02')
    expect(result.schedule.tasks.b?.currentStart).toBe('2026-01-08')
    expect(result.changedIds).toEqual(['a'])
  })

  it('a successor with slack absorbs a small slip without moving', () => {
    // b has two days of slack after a's end.
    const s = schedule([task('a', '2026-01-05', 3), task('b', '2026-01-10', 2)], [dep('a', 'b')])
    const result = moveTask(s, 'a', '2026-01-06')
    expect(result.schedule.tasks.b?.currentStart).toBe('2026-01-10')
    expect(result.changedIds).toEqual(['a'])
  })

  it('leaves unrelated tasks untouched', () => {
    const s = schedule(
      [task('a', '2026-01-05', 3), task('b', '2026-01-08', 2), task('x', '2026-01-05', 4)],
      [dep('a', 'b')],
    )
    const result = moveTask(s, 'a', '2026-01-07')
    expect(result.schedule.tasks.x).toEqual(s.tasks.x)
    expect(result.changedIds).not.toContain('x')
  })

  it('never moves predecessors', () => {
    const s = schedule([task('a', '2026-01-05', 3), task('b', '2026-01-08', 2)], [dep('a', 'b')])
    const result = moveTask(s, 'b', '2026-01-20')
    expect(result.schedule.tasks.a?.currentStart).toBe('2026-01-05')
    expect(result.changedIds).toEqual(['b'])
  })

  it('does not mutate the input schedule', () => {
    const s = deepFreeze(
      schedule([task('a', '2026-01-05', 3), task('b', '2026-01-08', 2)], [dep('a', 'b')]),
    )
    const result = moveTask(s, 'a', '2026-01-07')
    expect(result.schedule).not.toBe(s)
    expect(s.tasks.a?.currentStart).toBe('2026-01-05')
    expect(s.tasks.b?.currentStart).toBe('2026-01-08')
  })

  it('throws on an unknown task id, naming it', () => {
    const s = schedule([task('a', '2026-01-05', 3)], [])
    expect(() => moveTask(s, 'ghost', '2026-01-07')).toThrow(/"ghost"/)
  })

  it('rejects a malformed target date', () => {
    const s = schedule([task('a', '2026-01-05', 3)], [])
    expect(() => moveTask(s, 'a', 'garbage')).toThrow(/invalid iso date/i)
  })
})
