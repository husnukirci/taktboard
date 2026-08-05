/**
 * Client state for the loaded schedule. A thin adapter over the domain core:
 * every rule (propagation, delays, lanes) is a delegation into `src/domain/`.
 */

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  dateRange as domainDateRange,
  delayOf as domainDelayOf,
  moveTask as domainMoveTask,
  tasksByTrade as domainTasksByTrade,
} from '../domain'
import type { ISODate, Schedule, TradeLane } from '../domain'

export const useScheduleStore = defineStore('schedule', () => {
  const schedule = ref<Schedule | null>(null)
  /** Ids touched by the most recent move — drives ripple highlighting. */
  const lastChangedIds = ref<string[]>([])
  /** Successful moves since scenario load; re-keys the ripple pulse so back-to-back moves replay it. */
  const moveSeq = ref(0)

  /** Tasks pushed by the last move, excluding the task the user moved (changedIds is moved-first). */
  const rippledIds = computed<string[]>(() => lastChangedIds.value.slice(1))

  const tasksByTrade = computed<TradeLane[]>(() =>
    schedule.value === null ? [] : domainTasksByTrade(schedule.value),
  )

  const dateRange = computed<{ start: ISODate; end: ISODate } | null>(() =>
    schedule.value === null ? null : domainDateRange(schedule.value),
  )

  function delayOf(taskId: string): number {
    if (schedule.value === null) {
      throw new Error('delayOf: no schedule loaded')
    }
    return domainDelayOf(schedule.value, taskId)
  }

  function loadScenario(next: Schedule): void {
    schedule.value = next
    lastChangedIds.value = []
    moveSeq.value = 0
  }

  function moveTask(taskId: string, newStart: ISODate): void {
    if (schedule.value === null) {
      throw new Error('moveTask: no schedule loaded')
    }
    const result = domainMoveTask(schedule.value, taskId, newStart)
    schedule.value = result.schedule
    lastChangedIds.value = result.changedIds
    moveSeq.value += 1
  }

  function reset(): void {
    if (schedule.value === null) return
    const tasks = Object.fromEntries(
      Object.entries(schedule.value.tasks).map(([id, task]) => [
        id,
        { ...task, currentStart: task.baselineStart },
      ]),
    )
    schedule.value = { ...schedule.value, tasks }
    lastChangedIds.value = []
  }

  return {
    schedule,
    lastChangedIds,
    moveSeq,
    rippledIds,
    tasksByTrade,
    dateRange,
    delayOf,
    loadScenario,
    moveTask,
    reset,
  }
})
