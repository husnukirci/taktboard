/**
 * Read-only queries over the finish-to-start dependency graph.
 * Assumes a schedule that passed `validateSchedule` (acyclic, no dangling ids).
 */

import type { Schedule } from './types'

/** Ids of tasks that directly depend on `taskId`, in dependency-array order. */
export function successorsOf(schedule: Schedule, taskId: string): string[] {
  return schedule.dependencies.filter((d) => d.predecessorId === taskId).map((d) => d.successorId)
}

/** Ids of tasks that `taskId` directly depends on, in dependency-array order. */
export function predecessorsOf(schedule: Schedule, taskId: string): string[] {
  return schedule.dependencies.filter((d) => d.successorId === taskId).map((d) => d.predecessorId)
}

/**
 * All task ids, every predecessor before its successors (Kahn's algorithm).
 * Stable: ties resolve in task-record insertion order.
 * Throws on a cycle, naming the tasks that could not be ordered.
 */
export function topologicalOrder(schedule: Schedule): string[] {
  const taskIds = Object.keys(schedule.tasks)
  const inDegree = new Map<string, number>(taskIds.map((id) => [id, 0]))
  const successors = new Map<string, string[]>()
  for (const { predecessorId, successorId } of schedule.dependencies) {
    inDegree.set(successorId, (inDegree.get(successorId) ?? 0) + 1)
    successors.set(predecessorId, [...(successors.get(predecessorId) ?? []), successorId])
  }

  const queue = taskIds.filter((id) => inDegree.get(id) === 0)
  const order: string[] = []
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]
    if (id === undefined) break
    order.push(id)
    for (const next of successors.get(id) ?? []) {
      const remaining = (inDegree.get(next) ?? 0) - 1
      inDegree.set(next, remaining)
      if (remaining === 0) queue.push(next)
    }
  }

  if (order.length !== taskIds.length) {
    const stuck = taskIds.filter((id) => (inDegree.get(id) ?? 0) > 0)
    throw new Error(`dependency cycle between tasks ${stuck.map((id) => `"${id}"`).join(', ')}`)
  }
  return order
}
