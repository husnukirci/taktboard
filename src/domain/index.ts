/**
 * Public surface of the domain core. Consumers (store, api client, UI)
 * import from here, never from the individual modules.
 */

export type { Dependency, ISODate, Schedule, Task, Trade } from './types'
export { addDays, diffDays, eachDay, maxDate, parseISODate } from './dates'
export { ScheduleValidationError, validateSchedule } from './validate'
export { predecessorsOf, successorsOf, topologicalOrder } from './graph'
export { moveTask } from './propagate'
export type { MoveResult } from './propagate'
export { dateRange, delayOf, tasksByTrade } from './selectors'
export type { TradeLane } from './selectors'
