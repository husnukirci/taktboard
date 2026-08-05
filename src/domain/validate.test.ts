import { describe, expect, it } from 'vitest'
import type { Schedule } from './types'
import { ScheduleValidationError, validateSchedule } from './validate'

/** Minimal valid schedule: two trades, three tasks, one FS chain a → b. */
function validInput(): Schedule {
  return {
    trades: {
      elec: { id: 'elec', name: 'Electrics', order: 1 },
      dry: { id: 'dry', name: 'Drywall', order: 2 },
    },
    tasks: {
      a: {
        id: 'a',
        tradeId: 'elec',
        name: 'Rough-in',
        baselineStart: '2026-01-05',
        currentStart: '2026-01-05',
        durationDays: 3,
      },
      b: {
        id: 'b',
        tradeId: 'dry',
        name: 'Boarding',
        baselineStart: '2026-01-08',
        currentStart: '2026-01-08',
        durationDays: 2,
      },
      c: {
        id: 'c',
        tradeId: 'dry',
        name: 'Taping',
        baselineStart: '2026-01-12',
        currentStart: '2026-01-12',
        durationDays: 1,
      },
    },
    dependencies: [{ predecessorId: 'a', successorId: 'b' }],
  }
}

function problemsOf(input: unknown): string[] {
  try {
    validateSchedule(input)
  } catch (e) {
    if (e instanceof ScheduleValidationError) return e.problems
    throw e
  }
  throw new Error('expected validateSchedule to throw')
}

describe('validateSchedule — structure', () => {
  it('returns the typed schedule for valid input', () => {
    const input = validInput()
    expect(validateSchedule(input)).toEqual(input)
  })

  it('rejects non-object input', () => {
    expect(() => validateSchedule('nope')).toThrow(ScheduleValidationError)
    expect(() => validateSchedule(null)).toThrow(ScheduleValidationError)
  })

  it('rejects input missing top-level keys', () => {
    const problems = problemsOf({ trades: {} })
    expect(problems.join('\n')).toMatch(/tasks/)
    expect(problems.join('\n')).toMatch(/dependencies/)
  })

  it('rejects a task with missing or mistyped fields, naming the task', () => {
    const input = validInput()
    // @ts-expect-error deliberately broken task
    input.tasks.a = { id: 'a', tradeId: 'elec', name: 42 }
    const problems = problemsOf(input)
    expect(problems.join('\n')).toMatch(/task "a"/)
  })

  it('rejects a record whose key does not match the entity id', () => {
    const input = validInput()
    input.tasks.mismatch = { ...input.tasks.a!, id: 'a' }
    const problems = problemsOf(input)
    expect(problems.join('\n')).toMatch(/mismatch/)
  })

  it('collects all problems instead of stopping at the first', () => {
    const input = validInput()
    input.tasks.a!.durationDays = 0
    input.tasks.b!.baselineStart = 'garbage'
    const problems = problemsOf(input)
    expect(problems.length).toBeGreaterThanOrEqual(2)
  })
})

describe('validateSchedule — referential integrity', () => {
  it('rejects a task whose tradeId does not exist, naming both ids', () => {
    const input = validInput()
    input.tasks.a!.tradeId = 'ghost'
    const problems = problemsOf(input)
    expect(problems.join('\n')).toMatch(/task "a".*trade "ghost"/)
  })

  it('rejects a dependency whose endpoints do not exist, naming the ids', () => {
    const input = validInput()
    input.dependencies.push({ predecessorId: 'nope', successorId: 'b' })
    input.dependencies.push({ predecessorId: 'a', successorId: 'also-nope' })
    const problems = problemsOf(input)
    expect(problems.join('\n')).toMatch(/"nope"/)
    expect(problems.join('\n')).toMatch(/"also-nope"/)
  })
})

describe('validateSchedule — dependency graph', () => {
  it('rejects duplicate dependencies', () => {
    const input = validInput()
    input.dependencies.push({ predecessorId: 'a', successorId: 'b' })
    const problems = problemsOf(input)
    expect(problems.join('\n')).toMatch(/duplicate.*"a".*"b"/i)
  })

  it('rejects a self-dependency', () => {
    const input = validInput()
    input.dependencies.push({ predecessorId: 'c', successorId: 'c' })
    const problems = problemsOf(input)
    expect(problems.join('\n')).toMatch(/cycle|itself/i)
  })

  it('rejects a dependency cycle, naming the tasks involved', () => {
    const input = validInput()
    input.dependencies.push({ predecessorId: 'b', successorId: 'c' })
    input.dependencies.push({ predecessorId: 'c', successorId: 'a' })
    const problems = problemsOf(input)
    expect(problems.join('\n')).toMatch(/cycle/i)
    for (const id of ['a', 'b', 'c']) {
      expect(problems.join('\n')).toContain(`"${id}"`)
    }
  })

  it('accepts a diamond (two paths, no cycle)', () => {
    const input = validInput()
    input.dependencies.push({ predecessorId: 'a', successorId: 'c' })
    input.dependencies.push({ predecessorId: 'b', successorId: 'c' })
    expect(() => validateSchedule(input)).not.toThrow()
  })
})
