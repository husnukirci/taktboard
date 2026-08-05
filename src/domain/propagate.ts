/**
 * Delay propagation: move one task, push its transitive successors right so
 * every finish-to-start constraint holds again. Pure — input is never mutated.
 */

import { addDays, maxDate, parseISODate } from './dates'
import { predecessorsOf, successorsOf, topologicalOrder } from './graph'
import type { ISODate, Schedule, Task } from './types'

export interface MoveResult {
  schedule: Schedule
  changedIds: string[]
}

/**
 * Set `taskId`'s currentStart to `newStart`, then walk its transitive
 * successors in topological order, pushing any task that would now start
 * before its latest predecessor end up to that end. Successors are only ever
 * pushed right, never pulled; predecessors and unrelated tasks are untouched.
 * `changedIds` lists the moved task plus every pushed task, in push order.
 */
export function moveTask(schedule: Schedule, taskId: string, newStart: ISODate): MoveResult {
  parseISODate(newStart)
  const moved = schedule.tasks[taskId]
  if (moved === undefined) {
    throw new Error(`moveTask: unknown task "${taskId}"`)
  }

  const nextTasks: Record<string, Task> = {
    ...schedule.tasks,
    [taskId]: { ...moved, currentStart: newStart },
  }
  const changedIds = [taskId]

  // Only transitive successors of the moved task can be affected.
  const affected = new Set<string>()
  const frontier = [taskId]
  for (let i = 0; i < frontier.length; i++) {
    const id = frontier[i]
    if (id === undefined) break
    for (const succ of successorsOf(schedule, id)) {
      if (!affected.has(succ)) {
        affected.add(succ)
        frontier.push(succ)
      }
    }
  }

  for (const id of topologicalOrder(schedule)) {
    if (!affected.has(id)) continue
    const current = nextTasks[id]
    if (current === undefined) continue
    const predecessorEnds = predecessorsOf(schedule, id).map((predId) => {
      const pred = nextTasks[predId]
      if (pred === undefined) {
        throw new Error(`moveTask: dependency references missing task "${predId}"`)
      }
      return endOf(pred)
    })
    // Push right up to the latest predecessor end; never pull left.
    const requiredStart = maxDate(current.currentStart, ...predecessorEnds)
    if (requiredStart !== current.currentStart) {
      nextTasks[id] = { ...current, currentStart: requiredStart }
      changedIds.push(id)
    }
  }

  return { schedule: { ...schedule, tasks: nextTasks }, changedIds }
}

/** Exclusive end: the first day after the task. A successor may start on it. */
function endOf(task: Task): ISODate {
  return addDays(task.currentStart, task.durationDays)
}
