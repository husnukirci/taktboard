import { describe, expect, it } from 'vitest'
import { predecessorsOf, successorsOf, topologicalOrder } from './graph'
import type { Schedule, Task } from './types'

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    tradeId: 'elec',
    name: id,
    baselineStart: '2026-01-05',
    currentStart: '2026-01-05',
    durationDays: 1,
    ...overrides,
  }
}

/** a → b → d, a → c → d (diamond). e is isolated. */
function diamond(): Schedule {
  return {
    trades: { elec: { id: 'elec', name: 'Electrics', order: 1 } },
    tasks: {
      a: task('a'),
      b: task('b'),
      c: task('c'),
      d: task('d'),
      e: task('e'),
    },
    dependencies: [
      { predecessorId: 'a', successorId: 'b' },
      { predecessorId: 'a', successorId: 'c' },
      { predecessorId: 'b', successorId: 'd' },
      { predecessorId: 'c', successorId: 'd' },
    ],
  }
}

describe('successorsOf', () => {
  it('lists direct successors only', () => {
    expect(successorsOf(diamond(), 'a')).toEqual(['b', 'c'])
  })

  it('is empty for a sink or isolated task', () => {
    expect(successorsOf(diamond(), 'd')).toEqual([])
    expect(successorsOf(diamond(), 'e')).toEqual([])
  })
})

describe('predecessorsOf', () => {
  it('lists direct predecessors only', () => {
    expect(predecessorsOf(diamond(), 'd')).toEqual(['b', 'c'])
  })

  it('is empty for a source', () => {
    expect(predecessorsOf(diamond(), 'a')).toEqual([])
  })
})

describe('topologicalOrder', () => {
  it('includes every task exactly once', () => {
    const order = topologicalOrder(diamond())
    expect([...order].sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('places every predecessor before its successor', () => {
    const schedule = diamond()
    const order = topologicalOrder(schedule)
    for (const { predecessorId, successorId } of schedule.dependencies) {
      expect(order.indexOf(predecessorId)).toBeLessThan(order.indexOf(successorId))
    }
  })

  it('throws on a cycle, naming the tasks involved', () => {
    const schedule = diamond()
    schedule.dependencies.push({ predecessorId: 'd', successorId: 'a' })
    expect(() => topologicalOrder(schedule)).toThrow(/cycle.*"a".*"b".*"c".*"d"/s)
  })
})
