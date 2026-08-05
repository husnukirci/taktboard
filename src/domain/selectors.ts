/**
 * Read-only derived views over a validated schedule, for stores and UI.
 */

import { addDays, diffDays, maxDate } from './dates'
import type { ISODate, Schedule, Task, Trade } from './types'

/** Days the task has slipped vs. baseline; positive = late, negative = early. */
export function delayOf(schedule: Schedule, taskId: string): number {
  const task = schedule.tasks[taskId]
  if (task === undefined) {
    throw new Error(`delayOf: unknown task "${taskId}"`)
  }
  return diffDays(task.baselineStart, task.currentStart)
}

/**
 * Smallest window containing every task: earliest start to latest (exclusive)
 * end, across both baseline and current schedules.
 */
export function dateRange(schedule: Schedule): { start: ISODate; end: ISODate } {
  const tasks = Object.values(schedule.tasks)
  if (tasks.length === 0) {
    throw new Error('dateRange: schedule has no tasks')
  }
  const starts: ISODate[] = []
  const ends: ISODate[] = []
  for (const task of tasks) {
    for (const s of [task.baselineStart, task.currentStart]) {
      starts.push(s)
      ends.push(addDays(s, task.durationDays))
    }
  }
  // ISO dates order lexicographically; both arrays are non-empty.
  const start = starts.reduce((min, s) => (s < min ? s : min))
  const end = ends.reduce((max, e) => maxDate(max, e))
  return { start, end }
}

export interface TradeLane {
  trade: Trade
  tasks: Task[]
}

/** One lane per trade sorted by trade order; tasks sorted by currentStart, then id. */
export function tasksByTrade(schedule: Schedule): TradeLane[] {
  const trades = Object.values(schedule.trades).sort((a, b) => a.order - b.order)
  return trades.map((trade) => ({
    trade,
    tasks: Object.values(schedule.tasks)
      .filter((t) => t.tradeId === trade.id)
      .sort((a, b) => a.currentStart.localeCompare(b.currentStart) || a.id.localeCompare(b.id)),
  }))
}
