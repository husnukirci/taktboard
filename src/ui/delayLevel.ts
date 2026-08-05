/**
 * Maps a task's delay in days to a severity bucket for coloring. Thresholds
 * are the single source of truth for the board's traffic-light semantics.
 */

export type DelayLevel = 'ok' | 'warn' | 'late'

/** First delay (in days) that counts as a minor slip. */
export const WARN_THRESHOLD_DAYS = 1
/** First delay (in days) that counts as a major slip. */
export const LATE_THRESHOLD_DAYS = 3

/** Early or on-time tasks are 'ok'; being ahead of baseline is not a warning. */
export function delayLevel(days: number): DelayLevel {
  if (days >= LATE_THRESHOLD_DAYS) return 'late'
  if (days >= WARN_THRESHOLD_DAYS) return 'warn'
  return 'ok'
}
