/**
 * Core schedule model. Pure data — no behavior, no Vue, no Date objects.
 * Dates are day-granular ISO strings (YYYY-MM-DD), validated at boundaries.
 */

export type ISODate = string // YYYY-MM-DD, validated at boundaries

export interface Trade {
  id: string
  name: string
  order: number
}

export interface Task {
  id: string
  tradeId: string
  name: string
  baselineStart: ISODate
  currentStart: ISODate
  durationDays: number // >= 1
}

/** Finish-to-start only: successor may start on the predecessor's (exclusive) end. */
export interface Dependency {
  predecessorId: string
  successorId: string
}

export interface Schedule {
  trades: Record<string, Trade>
  tasks: Record<string, Task>
  dependencies: Dependency[]
}
