# taktboard — phase specs

Seven phases. **One phase = one Claude Code session = one PR.** Each spec is
self-contained: a fresh session reading only `CLAUDE.md`, `PLAN.md`, and its
own phase section has everything it needs. No phase depends on chat history.

## How a phase runs

1. **Start a fresh Claude Code session.** First instruction: read `CLAUDE.md`,
   `PLAN.md`, and the current phase in `PHASES.md`. Nothing else.
2. **Implement** the "In scope" list in order. Respect the TDD tier stated per
   item. Small conventional commits on a branch named `phase/<n>-<slug>`.
3. **Self-review** against the phase's review checklist *and* the global
   checklist below. Fix findings in follow-up commits (do not amend history).
4. **Open the PR** with the title given in the phase spec. PR description:
   what shipped, what was deliberately not done, review findings that were
   fixed, and anything punted (with a PLAN.md tier reference).
5. **Stop.** The author merges. The next phase starts in a new session.

### Global self-review checklist (every phase)

- [ ] `npm run lint && npm run typecheck && npm test && npm run build` all green
- [ ] Every "In scope" item done or explicitly listed as punted in the PR
- [ ] No scope creep: nothing from a later phase or higher tier snuck in
- [ ] New load-bearing decisions have an ADR in `docs/decisions.md`
- [ ] `docs/ai-workflow.md` has at least the friction log entries from this session
- [ ] Dead code, commented-out blocks, and stray `console.log` removed
- [ ] Re-read the diff top to bottom as a reviewer would; note and fix anything
      you would flag on a teammate's PR

---

## Phase 0 — Scaffold, tooling, CI, first deploy

**Context for a fresh session:** empty repository. This phase creates the
project skeleton and proves the pipeline end to end. No product code.

**Objective:** a deployed hello-world with green CI, so every later phase
ships to a live URL by default.

**In scope**

1. Vite scaffold: `npm create vite@latest` (vue-ts template), Node version
   pinned in `.nvmrc`.
2. TypeScript strict: `"strict": true`, `"noUncheckedIndexedAccess": true`.
3. Tailwind v4 via `@tailwindcss/vite`; `src/styles/globals.css` with the
   Tailwind import and design tokens (CSS custom properties for lane height,
   day-column width, delay colors — values in Phase 3 spec, placeholders fine
   here).
4. Pinia installed and registered; empty `src/state/` directory with a
   placeholder store that holds a `ready: boolean` (deleted in Phase 2).
5. Lint/format: ESLint flat config (`eslint-plugin-vue`, TS), Prettier,
   `.prettierignore`; scripts `lint`, `format`, `typecheck`.
6. Tests: vitest + happy-dom + @vue/test-utils; one trivial passing test so
   the runner is proven; script `test`.
7. Git hygiene: husky + lint-staged (prettier + eslint on staged files),
   commitlint with conventional config, `.gitmessage` template.
8. CI: `.github/workflows/ci.yml` — on push and PR: install (npm ci), lint,
   typecheck, test, build. Single job is fine.
9. Netlify: `netlify.toml` (build `npm run build`, publish `dist/`); connect
   the repo, confirm the hello-world page is live.
10. `README.md` stub: project one-liner, quick start (clone → `npm ci` →
    `npm run dev`), link to PLAN.md and PHASES.md.
11. ADRs 1, 2, 7 drafted in `docs/decisions.md` (idiom choice, Pinia,
    Netlify + GH Actions).

**Out of scope:** any domain code, any UI beyond the default page, vue-query.

**Acceptance:** fresh clone runs in two commands; pushing the branch runs CI
green; the Netlify URL serves the app; PR preview deploys work if enabled.

**Phase review checklist:** CI actually failed at least once during setup and
you saw why (proves the gates gate); no unused template leftovers
(HelloWorld.vue etc. removed); lockfile committed.

**PR:** `chore(scaffold): project skeleton, tooling, CI, Netlify deploy`

---

## Phase 1 — Domain core (strict TDD)

**Context for a fresh session:** scaffold exists (Phase 0). This phase builds
the entire business logic as a pure TypeScript module. **No Vue imports
anywhere under `src/domain/`. No UI. No store.** Strict red-green-refactor:
every behavior gets a failing test first; commit granularity may follow
test-then-implementation pairs.

**Objective:** a fully tested schedule engine another program could use.

**Domain rules (authoritative):** a schedule has trades, tasks, and
finish-to-start dependencies. Tasks are day-granular. A task's **end** is
exclusive: `end = addDays(currentStart, durationDays)`; a successor may start
on its predecessor's end date, not before. **Delay** is
`diffDays(baselineStart, currentStart)` (positive = late, negative = early).
Moving a task never moves its predecessors and never shrinks durations.

**In scope**

1. `src/domain/types.ts`
   ```ts
   type ISODate = string; // YYYY-MM-DD, validated at boundaries
   interface Trade { id: string; name: string; order: number }
   interface Task {
     id: string; tradeId: string; name: string;
     baselineStart: ISODate; currentStart: ISODate; durationDays: number; // >= 1
   }
   interface Dependency { predecessorId: string; successorId: string } // FS only
   interface Schedule {
     trades: Record<string, Trade>;
     tasks: Record<string, Task>;
     dependencies: Dependency[];
   }
   ```
2. `src/domain/dates.ts` — `parseISODate` (throws on invalid), `addDays`,
   `diffDays`, `eachDay(from, to)`, `maxDate`. UTC-only internally; no
   `Date` arithmetic outside this file. Tests include month/year boundaries
   and an invalid-format rejection.
3. `src/domain/validate.ts` — `validateSchedule(unknown): Schedule`:
   structural validation of unknown input, referential integrity (every
   `tradeId`/dependency endpoint exists), `durationDays >= 1`, ISO date
   check, **cycle detection** over dependencies, duplicate-dependency
   rejection. Returns a typed `Schedule` or throws a `ScheduleValidationError`
   listing all problems, not just the first.
4. `src/domain/graph.ts` — `successorsOf`, `predecessorsOf`,
   `topologicalOrder(schedule): string[]` (used by validate and propagate).
5. `src/domain/propagate.ts` —
   `moveTask(schedule, taskId, newStart): { schedule: Schedule; changedIds: string[] }`.
   Pure: returns a new schedule, input untouched. Sets the moved task's
   `currentStart`, then walks successors in topological order pushing any
   task whose `currentStart` is before the latest predecessor end up to that
   end. `changedIds` = moved task + every pushed task, in push order.
   Test list (minimum): single successor pushed; chain of three cascades;
   diamond (two predecessors — successor obeys the later one); moving a task
   **earlier** pulls nothing (successors keep their dates); successor with
   slack absorbs a small slip without moving; unrelated tasks untouched;
   input schedule not mutated (deep-freeze in test).
6. `src/domain/selectors.ts` — `delayOf(schedule, taskId): number`,
   `dateRange(schedule): { start: ISODate; end: ISODate }` (min start to max
   end across baseline *and* current), `tasksByTrade(schedule)` sorted by
   trade `order` then `currentStart`.
7. `src/domain/index.ts` — public re-exports only.

**Out of scope:** Pinia, fetch, JSON file, any component.

**Acceptance:** 100% of domain behaviors covered by tests that fail when the
behavior is broken; `npx vitest run src/domain` green; ADRs 3, 5, 6 written.

**Phase review checklist:** mutate a rule on purpose (e.g. flip the push
comparison) and confirm at least one test fails, then revert; no `any` in the
module; error messages name the offending task/dependency ids.

**PR:** `feat(domain): schedule model, validation, delay propagation`

---

## Phase 2 — Stores and data loading

**Context for a fresh session:** domain core exists (Phase 1) and is the only
source of business logic. This phase wires state management and gets the
scenario over HTTP. Store actions are strict TDD; the api client and query
plumbing are pragmatic tier.

**Objective:** app boots, fetches the seed scenario, and holds it in a store
the UI can subscribe to. Nothing visible yet beyond a debug dump.

**In scope**

1. `public/scenario.json` — seed data: 4 trades (Shell, Electrics, Drywall,
   Painting; `order` 1–4), ~12 tasks across ~4 calendar weeks, ~10 FS
   dependencies forming at least one chain of 4 and one diamond, and **one
   task pre-slipped** (currentStart 2 days after baselineStart) so delays are
   visible on first load. Dates relative to a fixed anchor (e.g. project
   starts on a Monday); values hardcoded, realistic names.
2. `src/api/client.ts` — `getScenario(): Promise<Schedule>`: native `fetch`
   of `/scenario.json`, `res.ok` check with a typed `ApiError`, response
   passed through `validateSchedule` before returning. No axios.
3. vue-query: `@tanstack/vue-query` plugin registered in `main.ts`;
   `src/composables/useScenarioQuery.ts` wrapping `useQuery` with key
   `['scenario']`, `staleTime: Infinity` (static file), no retries on 4xx.
4. `src/state/scheduleStore.ts` (Pinia, strict TDD on actions):
   - state: `schedule: Schedule | null`, `lastChangedIds: string[]`
   - getters: `tasksByTrade`, `dateRange`, `delayOf` — all thin delegations
     to domain selectors
   - actions: `loadScenario(schedule)`, `moveTask(taskId, newStart)` (calls
     domain `moveTask`, replaces `schedule`, sets `lastChangedIds`),
     `reset()` (restores every task's `currentStart` to `baselineStart`)
   - tests with `setActivePinia(createPinia())` per test: load, move
     delegates + records changed ids, reset restores baseline.
5. `src/state/uiStore.ts` — state only for now: `drag: { taskId; previewStart } | null`,
   `hoveredTaskId`, `selectedTaskId`. Actions are trivial setters; pragmatic
   tests.
6. Delete the Phase 0 placeholder store.
7. `App.vue`: use `useScenarioQuery`; on success call `loadScenario`; render
   three states — loading text, error text with the validation message, and
   on success a temporary `<pre>` dump of task count + date range (replaced
   in Phase 3).
8. ADR 9 finalized in `docs/decisions.md` (copy the decision text from
   PLAN.md §6, expand consequences).

**Out of scope:** timeline rendering, drag, dependency arrows, mutations via
vue-query.

**Acceptance:** `npm run dev` shows loading → data summary; breaking
`scenario.json` (bad ref, cycle) shows the validation error in the UI; store
tests green and isolated.

**Phase review checklist:** vue-query owns fetching only — confirm no
component reads query data directly except the App-level handoff; store has
zero business logic (every rule call traces into `src/domain/`).

**PR:** `feat(state): pinia stores, typed api client, scenario loading`

---

## Phase 3 — Static timeline render

**Context for a fresh session:** stores hold a loaded schedule (Phase 2).
This phase renders the board read-only: no pointer interaction, no arrows.
Components are untested-by-design except one smoke test; geometry utils get
pragmatic tests.

**Objective:** the seed scenario is visible and legible: lanes, day columns,
task bars, baseline ghosts, delay colors.

**Layout contract (authoritative):**

- CSS grid; **one column per calendar day** in the store's `dateRange`,
  column width `--day-w: 2.75rem`; one row per trade, lane height
  `--lane-h: 4rem`; a sticky header row with day-of-month labels and month
  labels spanning their days; a sticky left column with trade names,
  width `--trade-w: 10rem`.
- A task bar occupies `grid-column: start / span durationDays` where `start`
  is `diffDays(rangeStart, task.currentStart) + 1` (+ offset for the trade
  column). Geometry lives in `src/ui/geometry.ts` — `columnOfDate`,
  `barGridColumn(task)`, plus pixel helpers `xOfDate`, `barRect(task)`
  (needed by the SVG layer in Phase 5; write and test them now).
- Baseline ghost: a low-opacity outlined bar at the task's *baseline*
  position, rendered under the current bar, only when `delayOf ≠ 0`.
- Delay colors (design tokens from Phase 0, final values now):
  on-time `--ok: #10b981`-ish emerald; slip 1–2 days `--warn` amber; slip
  ≥ 3 days `--late` red. Thresholds are constants in
  `src/ui/delayLevel.ts` (`delayLevel(days): 'ok' | 'warn' | 'late'`,
  pragmatic-tested). Color is never the only signal: the bar also shows
  `+Nd` text when late.
- Weekend columns get a subtle background tint (visual only — domain stays
  calendar-day).

**In scope**

1. `src/ui/geometry.ts` + tests; `src/ui/delayLevel.ts` + tests.
2. Components under `src/components/`: `TimelineBoard.vue` (grid container,
   consumes store), `TimelineHeader.vue`, `TradeLabel.vue`, `TaskBar.vue`
   (current bar + ghost + delay text; props typed from domain types).
3. Replace the Phase 2 `<pre>` dump with `TimelineBoard`.
4. Horizontal scroll for long ranges; header and trade column stay sticky.
5. Basic a11y: board is `role="grid"`-free (it's not tabular interaction yet)
   but each bar is a focusable element with an `aria-label` like
   "Drywall ceiling, 12–15 Aug, 2 days late"; visible focus ring.
6. One smoke test: render `TimelineBoard` with a small fixture via
   `renderWithStores` helper (create it in `src/test/`), assert task names
   appear.
7. ADR 4 written (CSS grid + SVG overlay; alternatives: canvas, Gantt libs).

**Out of scope:** pointer events, dependency arrows, animations, selection UI.

**Acceptance:** first load shows the full scenario; the pre-slipped task is
amber/red with a ghost showing where it should have been; window resize and
horizontal scroll behave; keyboard Tab reaches every bar.

**Phase review checklist:** zero `new Date` or date math in components
(everything through domain/dates + ui/geometry); no absolute positioning for
bars (grid only); Tailwind utilities only, tokens for the layout constants.

**PR:** `feat(ui): static timeline board with baseline ghosts and delay colors`

---

## Phase 4 — Drag-to-reschedule

**Context for a fresh session:** the board renders read-only (Phase 3). This
phase adds the core interaction: drag a bar horizontally, drop, watch the
delay propagate. Pointer plumbing is untested-by-design; the composable's
date math is pragmatic-tested; store behavior is already covered.

**Objective:** dragging a task and seeing successors ripple is smooth and
obviously correct.

**Interaction contract (authoritative):**

- Pointer events only (`pointerdown` on the bar → `setPointerCapture`;
  `pointermove`; `pointerup`/`pointercancel`). No document-level listeners,
  no drag library. rAF-throttle the move handler.
- Horizontal only. During drag: `uiStore.drag = { taskId, previewStart }`
  where `previewStart = addDays(dragStartDate, round(dxPx / dayWidthPx))`.
  **Only the dragged bar** renders from the preview; every other bar renders
  from the store. Snap to whole days.
- On drop: if `previewStart ≠ currentStart`, call
  `scheduleStore.moveTask(taskId, previewStart)`; clear `uiStore.drag`.
  Propagation runs once, on commit — not during move.
- Escape during drag cancels (clear preview, no commit).
- Ripple feedback: bars whose id is in `lastChangedIds` (excluding the
  dragged task) play a brief highlight pulse (CSS animation, ~600 ms,
  disabled under `prefers-reduced-motion`); `lastChangedIds` clears on the
  next successful move.
- Keyboard equivalent: focused bar + ArrowLeft/ArrowRight moves the task one
  day (same `moveTask` path); makes the core interaction accessible.

**In scope**

1. `src/composables/useTaskDrag.ts` — encapsulates the pointer lifecycle,
   exposes `onPointerDown` and reactive `previewStart`; unit-test the
   px→days snapping and the cancel path (simulate events on a stub element).
2. `TaskBar.vue`: wire the composable; render from preview when this task is
   dragging; `cursor-grab`/`cursor-grabbing`; keyboard arrow handling.
3. Ripple pulse animation + `prefers-reduced-motion` guard.
4. `reset` button in a minimal `BoardToolbar.vue` (calls `scheduleStore.reset`)
   so demos are repeatable.
5. Manual QA script executed and pasted into the PR description: drag the
   first chain task 3 days right (chain cascades), drag it back (successors
   stay — matches domain rule), drag a slack task 1 day (nothing else moves),
   Escape mid-drag, keyboard-move a bar, reset.

**Out of scope:** vertical drag / trade reassignment, multi-select, undo,
dependency arrows.

**Acceptance:** the manual QA script passes; dragging feels 60fps-smooth with
devtools performance recording showing no layout thrash from non-dragged
bars; store tests still green untouched.

**Phase review checklist:** confirm zero store writes during pointermove
(only uiStore preview); confirm `pointercancel` handled (simulate by
alt-tabbing mid-drag); no listener leaks (drag twice, check
`getEventListeners` count stable).

**PR:** `feat(interaction): drag-to-reschedule with delay ripple`

---

## Phase 5 — Dependency arrows and polish

**Context for a fresh session:** the board is interactive (Phase 4). This
phase makes the dependency structure visible and finishes the visual/a11y
pass. SVG layer is untested-by-design; path math is pragmatic-tested.

**Objective:** a viewer can see *why* tasks moved: arrows connect
predecessors to successors, and the whole board reads as a finished tool.

**In scope**

1. `src/ui/edgePath.ts` — `dependencyPath(fromRect, toRect): string`
   producing an SVG path from predecessor bar end to successor bar start
   (elbow or gentle bezier; pick one, note it in ADR 4's consequences).
   Uses `barRect` from Phase 3 geometry. Pragmatic tests on a couple of
   fixtures (path starts/ends at expected points).
2. `DependencyLayer.vue` — one absolutely-positioned SVG over the grid,
   sized to the scroll content, `pointer-events: none`; one `<path>` per
   dependency, derived from store + geometry (no DOM measurement). Arrowhead
   via `<marker>`. During a drag, paths touching the dragged task follow the
   preview position.
3. Hover affordance: hovering a bar highlights its incoming/outgoing paths
   and dims others (drive from `uiStore.hoveredTaskId`).
4. Visual polish pass: consistent spacing, bar corner radius, header
   typography, empty/loading/error states styled (not raw text), favicon +
   page title.
5. A11y pass: landmarks (`role="application"` avoided; use headings +
   labeled regions), focus order sanity, `aria-live="polite"` region
   announcing moves ("Drywall ceiling moved to 14 Aug; 2 tasks rescheduled"),
   color-contrast check on the three delay colors against their backgrounds.
6. Performance sanity: with the seed scenario, a drag frame stays under
   ~4 ms scripting on a mid-tier laptop profile; note the measurement in the
   PR.

**Out of scope:** critical path, BroadcastChannel sync, import/export (all
Tier 2).

**Acceptance:** arrows track bars during and after drags; hover highlighting
works; screen-reader announces a move; Lighthouse a11y ≥ 95 on the deployed
preview.

**Phase review checklist:** SVG derives purely from state + geometry (grep
for `getBoundingClientRect` — only allowed in the drag composable, if at
all); arrows correct after horizontal scroll; reduced-motion verified.

**PR:** `feat(ui): dependency arrows, hover focus, a11y and visual polish`

---

## Phase 6 — Docs, ADR pass, v1 release

**Context for a fresh session:** the product is feature-complete for Tier 1
(Phases 0–5 merged). This phase ships the documentation as a first-class
deliverable and cuts v1. Mostly writing; code changes only if the docs pass
uncovers something small.

**Objective:** a stranger understands the project, its decisions, and its
process in ten minutes, from the repo alone.

**In scope**

1. `README.md` full version: what/why one-paragraph, screenshot or GIF of a
   drag-with-ripple, live Netlify URL, quick start, architecture section
   with a mermaid flowchart (host → App → vue-query → api client →
   scenario.json; stores → domain core; components → stores), tech-choices
   table with ADR links (floweave README is the template), repo orientation
   tree, Tier 2/3 roadmap from PLAN.md.
2. `docs/decisions.md` audit: ADRs 1–9 present, each in Context / Decision /
   Consequences form, statuses set; add any decision made mid-build that
   lacks one (check PR descriptions for the word "decided").
3. `docs/ai-workflow.md` finalized: per-phase narrative — what the session
   was asked, where AI output was wrong and how review/tests caught it,
   prompts that had to be reworded, an honest closing reflection. Source
   material is the incremental log entries and PR descriptions.
4. `docs/api.md` (short): the scenario.json schema documented field by
   field, plus the store's public actions — the seams a backend would plug
   into.
5. Housekeeping: LICENSE (MIT), repo description + topics on GitHub, final
   Lighthouse and bundle-size numbers in the README (build and record
   gzipped JS size).
6. Tag `v1.0.0`; confirm the Netlify production deploy matches the tag.

**Out of scope:** new features of any kind. If the docs pass reveals a bug,
file it as an issue; fix only if trivial (< 15 min) and note it in the PR.

**Acceptance:** the Definition of Done in PLAN.md §7 is satisfiable by a
stranger following only the README; every PLAN.md Tier 1 checkbox ticked.

**Phase review checklist:** click every link in every doc; run the README
quick start verbatim in a fresh clone; read ai-workflow.md asking "would I
believe this if a candidate showed it to me" and cut anything performative.

**PR:** `docs: v1 documentation, ADR audit, release`