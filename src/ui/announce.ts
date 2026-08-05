/**
 * Screen-reader text for schedule changes, fed to the aria-live region in
 * App.vue. Pure over (schedule, changedIds) so it stays testable without DOM.
 */

import type { Schedule } from '../domain'
import { formatDay } from './geometry'

/**
 * One sentence per successful move, e.g.
 * "Boarding & closing moved to 17 Mar; 2 tasks rescheduled."
 * `changedIds` is moved-first (the store's `lastChangedIds`); null when it
 * names no known task, so callers can render nothing.
 */
export function moveAnnouncement(schedule: Schedule, changedIds: string[]): string | null {
  const movedId = changedIds[0]
  if (movedId === undefined) return null
  const moved = schedule.tasks[movedId]
  if (moved === undefined) return null
  const pushed = changedIds.length - 1
  const ripple =
    pushed === 0
      ? 'no other tasks rescheduled'
      : pushed === 1
        ? '1 task rescheduled'
        : `${pushed} tasks rescheduled`
  return `${moved.name} moved to ${formatDay(moved.currentStart)}; ${ripple}.`
}
