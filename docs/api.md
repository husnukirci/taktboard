# API seams

taktboard's "API" in v1 is a static file, `public/scenario.json`, fetched by
the typed client in `src/api/client.ts` and validated into a `Schedule`
before anything else may touch it. This document records the two seams a
real backend would plug into: the wire schema and the store's public
surface. (The evolution path — optimistic `useMutation` against a NestJS
endpoint — is in [ADR 9](decisions.md#adr-9--data-loading-fetch--typed-client--vue-query-pinia-for-client-state).)

## scenario.json — the `Schedule` schema

Top level: three required fields.

```jsonc
{
  "trades": { "<tradeId>": Trade, ... },   // record keyed by trade id
  "tasks": { "<taskId>": Task, ... },      // record keyed by task id
  "dependencies": [Dependency, ...]        // array, finish-to-start only
}
```

### `Trade`

| Field   | Type     | Meaning                                                  |
| ------- | -------- | -------------------------------------------------------- |
| `id`    | `string` | Unique id; **must equal its record key** in `trades`.    |
| `name`  | `string` | Display name of the lane ("Electrics").                  |
| `order` | `number` | Sort order of the lane on the board, ascending.          |

### `Task`

| Field           | Type     | Meaning                                                                                        |
| --------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `id`            | `string` | Unique id; **must equal its record key** in `tasks`.                                           |
| `tradeId`       | `string` | Owning trade; must reference an existing trade.                                                |
| `name`          | `string` | Display name of the bar.                                                                       |
| `baselineStart` | ISO date | Planned start, `YYYY-MM-DD`. Never changed by the app.                                         |
| `currentStart`  | ISO date | Actual/current start, `YYYY-MM-DD`. Moves push this. Delay = `currentStart − baselineStart`.   |
| `durationDays`  | `number` | Calendar-day duration, `>= 1`. A task's end is **exclusive**: `end = currentStart + duration`. |

### `Dependency`

| Field           | Type     | Meaning                                              |
| --------------- | -------- | ---------------------------------------------------- |
| `predecessorId` | `string` | Task that must finish first; must exist in `tasks`.  |
| `successorId`   | `string` | Task that may then start; must exist in `tasks`.     |

Semantics are finish-to-start only: the successor may start **on** the
predecessor's (exclusive) end date. Other dependency kinds are rejected at
the type level ([ADR 5](decisions.md#adr-5--day-granular-iso-dates-exclusive-task-end),
[ADR 6](decisions.md#adr-6--delay-propagation-as-an-eager-topological-push)).

### Boundary validation

Every response passes through `validateSchedule` (`src/domain/validate.ts`)
before leaving the api client. It aggregates **all** problems into one
`ScheduleValidationError` (not just the first), each message naming the
offending id. Rejected, beyond shape/type errors:

- record key ≠ the entry's `id`
- `tradeId` / `predecessorId` / `successorId` referencing a missing entity
- malformed or impossible ISO dates (checked by `src/domain/dates.ts`)
- `durationDays < 1`
- duplicate dependencies, self-dependencies, and dependency cycles

A backend replacing `scenario.json` only has to satisfy this schema; the
client re-validates regardless, so a bad payload surfaces as a precise
message in the UI, never a downstream crash.

## Store surface — `useScheduleStore`

The Pinia store (`src/state/scheduleStore.ts`) is the single write path for
schedule state; every rule is a delegation into `src/domain/`. A backend
integration would call these same actions (or replay their domain
counterparts server-side — `moveTask` is pure and portable).

### Actions

| Action                                        | Behavior                                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `loadScenario(schedule: Schedule)`            | Replaces the loaded schedule; clears `lastChangedIds`, resets `moveSeq`. Called once per successful fetch by the App-level handoff.                                       |
| `moveTask(taskId: string, newStart: ISODate)` | Delegates to domain `moveTask`: sets the task's `currentStart`, pushes transitive successors right (never left), stores `changedIds` (moved-first), increments `moveSeq`. |
| `reset()`                                     | Restores every task's `currentStart` to its `baselineStart`; clears `lastChangedIds`. No-op if nothing is loaded.                                                        |

### Read surface

| Member           | Type                                        | Meaning                                                              |
| ---------------- | ------------------------------------------- | -------------------------------------------------------------------- |
| `schedule`       | `Schedule \| null`                          | The loaded schedule; `null` before load.                             |
| `lastChangedIds` | `string[]`                                  | Ids touched by the most recent move, push order, moved task first.   |
| `rippledIds`     | `string[]`                                  | `lastChangedIds` minus the moved task — drives the ripple pulse.     |
| `moveSeq`        | `number`                                    | Successful moves since load; re-keys the pulse animation.            |
| `tasksByTrade`   | `TradeLane[]`                               | Lanes in trade order, each with its tasks — the board's row model.   |
| `dateRange`      | `{ start, end } \| null`                    | Overall span across baseline and current dates — the board's width.  |
| `delayOf(id)`    | `(taskId: string) => number`                | Days late vs. baseline (0 = on time); throws if nothing is loaded.   |

Transient interaction state (drag preview, hover, selection) lives in a
separate `uiStore` and is deliberately not part of this seam — a backend
never sees it.
