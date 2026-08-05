/**
 * Boundary validation: turns unknown input (e.g. fetched JSON) into a typed
 * `Schedule` or throws a `ScheduleValidationError` listing every problem found.
 */

import { parseISODate } from './dates'
import { topologicalOrder } from './graph'
import type { Schedule } from './types'

export class ScheduleValidationError extends Error {
  readonly problems: string[]

  constructor(problems: string[]) {
    super(`Invalid schedule:\n${problems.map((p) => `  - ${p}`).join('\n')}`)
    this.name = 'ScheduleValidationError'
    this.problems = problems
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function checkEntity(
  kind: 'trade' | 'task',
  key: string,
  value: unknown,
  fields: Record<string, (v: unknown) => boolean>,
  problems: string[],
): void {
  if (!isRecord(value)) {
    problems.push(`${kind} "${key}" must be an object`)
    return
  }
  for (const [field, isValid] of Object.entries(fields)) {
    if (!isValid(value[field])) {
      problems.push(`${kind} "${key}": invalid or missing field "${field}"`)
    }
  }
  if (typeof value.id === 'string' && value.id !== key) {
    problems.push(`${kind} record key "${key}" does not match its id "${String(value.id)}"`)
  }
}

const isString = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

function isISODate(v: unknown): boolean {
  if (typeof v !== 'string') return false
  try {
    parseISODate(v)
    return true
  } catch {
    return false
  }
}

export function validateSchedule(input: unknown): Schedule {
  if (!isRecord(input)) {
    throw new ScheduleValidationError(['schedule must be an object'])
  }
  const problems: string[] = []

  const { trades, tasks, dependencies } = input
  if (!isRecord(trades)) problems.push('"trades" must be a record of trades')
  if (!isRecord(tasks)) problems.push('"tasks" must be a record of tasks')
  if (!Array.isArray(dependencies)) problems.push('"dependencies" must be an array')

  if (isRecord(trades)) {
    for (const [key, trade] of Object.entries(trades)) {
      checkEntity(
        'trade',
        key,
        trade,
        { id: isString, name: isString, order: isFiniteNumber },
        problems,
      )
    }
  }

  if (isRecord(tasks)) {
    for (const [key, task] of Object.entries(tasks)) {
      checkEntity(
        'task',
        key,
        task,
        {
          id: isString,
          tradeId: isString,
          name: isString,
          baselineStart: isISODate,
          currentStart: isISODate,
          durationDays: (v) => Number.isInteger(v) && (v as number) >= 1,
        },
        problems,
      )
    }
  }

  if (Array.isArray(dependencies)) {
    dependencies.forEach((dep, i) => {
      if (!isRecord(dep) || !isString(dep.predecessorId) || !isString(dep.successorId)) {
        problems.push(`dependency at index ${i} must have predecessorId and successorId strings`)
      }
    })
  }

  // Semantic checks only make sense on structurally sound input.
  if (problems.length === 0 && isRecord(trades) && isRecord(tasks) && Array.isArray(dependencies)) {
    const deps = dependencies as { predecessorId: string; successorId: string }[]

    for (const [key, task] of Object.entries(tasks)) {
      const tradeId = (task as { tradeId: string }).tradeId
      if (!(tradeId in trades)) {
        problems.push(`task "${key}" references missing trade "${tradeId}"`)
      }
    }

    const seenPairs = new Set<string>()
    for (const { predecessorId, successorId } of deps) {
      for (const id of [predecessorId, successorId]) {
        if (!(id in tasks)) {
          problems.push(
            `dependency ${predecessorId} → ${successorId} references missing task "${id}"`,
          )
        }
      }
      const pair = `${predecessorId} → ${successorId}`
      if (seenPairs.has(pair)) {
        problems.push(`duplicate dependency "${predecessorId}" → "${successorId}"`)
      }
      seenPairs.add(pair)
      if (predecessorId === successorId) {
        problems.push(`task "${predecessorId}" depends on itself`)
      }
    }

    if (problems.length === 0) {
      try {
        // Everything above passed, so the graph fields are structurally sound;
        // topologicalOrder only reads task keys and dependency endpoints.
        topologicalOrder({ trades: {}, tasks, dependencies: deps } as Schedule)
      } catch (e) {
        problems.push(e instanceof Error ? e.message : String(e))
      }
    }
  }

  if (problems.length > 0) {
    throw new ScheduleValidationError(problems)
  }
  return input as unknown as Schedule
}
