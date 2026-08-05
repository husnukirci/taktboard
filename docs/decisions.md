# Architecture decision records

Short-form Nygard ADRs. Statuses: proposed, accepted, superseded.
The full list of planned ADRs is in PLAN.md §6.

## ADR 1 — Vue 3 `<script setup>` + composition API only

Status: accepted (2026-08-05)

**Context.** Vue offers three component idioms (options API, composition API
with `setup()`, `<script setup>`). A small codebase read by strangers should
not make reviewers context-switch between idioms.

**Decision.** Every component uses `<script setup lang="ts">`. No options
API, no class components, no JSX. Enforced by review and the working
agreement in CLAUDE.md.

**Consequences.** One idiom to learn; best TypeScript inference Vue offers;
composables compose naturally. Contributors coming from options-API
codebases pay a small onboarding cost. Some older documentation snippets
need translating.

## ADR 2 — Pinia for state, over hand-rolled reactive stores

Status: accepted (2026-08-05)

**Context.** The app needs shared state between the timeline board, toolbar,
and drag interaction. Vue's `reactive()` in a module would work, but gives no
devtools story and blurs where mutations are allowed.

**Decision.** Pinia is the single state container. Domain logic stays in
`src/domain/` as pure TypeScript; stores are thin adapters that call domain
functions and hold results. Test isolation via `setActivePinia(createPinia())`
per test.

**Consequences.** Devtools time-travel and inspection for free; store actions
are an explicit, greppable mutation surface; the domain module stays
framework-free and portable (a future NestJS backend could reuse it). Cost:
one more dependency and a thin layer of indirection the store must not grow
logic of its own — reviewed per phase.

## ADR 3 — Domain core as a pure TypeScript module

Status: accepted (2026-08-05)

**Context.** The schedule engine (model, validation, delay propagation) is
the part of this project most worth testing exhaustively and most likely to
be reused — a Tier 3 NestJS backend would need the same rules. Coupling it
to Vue reactivity would make both harder.

**Decision.** Everything under `src/domain/` is plain TypeScript with zero
Vue (or any framework) imports. Functions are pure: `moveTask` returns a new
schedule and never mutates its input (enforced by a deep-freeze test).
Consumers import from `src/domain/index.ts` only. The Pinia store adapts the
domain to the UI; it adds no rules of its own.

**Consequences.** The engine tests run without a DOM and the whole module
could be published or moved server-side unchanged. Purity costs copies on
every move — fine at ~dozens of tasks; revisit only with evidence.
Boundary validation (`validateSchedule`) is where unknown JSON becomes a
typed `Schedule`, so inner functions may assume a well-formed graph.

## ADR 5 — Day-granular ISO dates, exclusive task end

Status: accepted (2026-08-05)

**Context.** Construction takt plans think in days, not hours. `Date`
objects invite timezone drift and accidental arithmetic all over the
codebase; a portfolio reviewer should find date logic in exactly one place.

**Decision.** The domain boundary speaks `YYYY-MM-DD` strings only. All
date math lives in `src/domain/dates.ts`, which parses to UTC internally
and rejects malformed or impossible dates. A task's end is **exclusive**:
`end = addDays(currentStart, durationDays)`, so a successor may start on
its predecessor's end date. Working-day/holiday calendars are explicitly
out of scope for Tier 1 (calendar days only).

**Consequences.** Dates are comparable lexicographically, serialize to JSON
verbatim, and diff in tests without fixtures. The exclusive end makes
duration math off-by-one-free (`duration = diffDays(start, end)`). Cost:
durations shown to users span weekends; a working-day calendar would slot
in behind `dates.ts` without touching callers.

## ADR 6 — Delay propagation as an eager topological push

Status: accepted (2026-08-05)

**Context.** When a task slips, every transitive successor that would now
start before its predecessor finishes must move. Alternatives: constraint
solving (overkill), lazy evaluation in selectors (hides the ripple the UI
wants to show), or an eager pass that rewrites the schedule.

**Decision.** `moveTask(schedule, taskId, newStart)` sets the new start,
then walks the moved task's transitive successors in topological order,
pushing each task right to its latest predecessor's end when violated —
never pulling any task earlier, never moving predecessors, never changing
durations. It returns the new schedule plus `changedIds` in push order.

**Consequences.** One deterministic pass per move, trivially previewable
(pure function — Tier 2's live drag preview calls it on the fly) and
server-authoritative-ready: a backend could run the identical function and
broadcast the result. Slack is consumed silently (a successor with room
absorbs a slip), which matches how site managers read takt boards. Moving
a task earlier never auto-compresses the plan; pulling successors left is
a deliberate non-feature.

## ADR 7 — Netlify for hosting, GitHub Actions for CI

Status: accepted (2026-08-05)

**Context.** The project needs a live URL from the first commit
(deploy-first rule in PLAN.md) and CI gates on every push. It is a static
SPA with no server-side requirements in Tier 1.

**Decision.** Netlify builds and hosts the site (`netlify.toml`: build
`npm run build`, publish `dist/`), including PR preview deploys. GitHub
Actions runs the quality gates (lint, typecheck, test, build) on every push
and pull request; the two are independent pipelines.

**Consequences.** Zero-config previews per PR make every phase reviewable in
a browser. CI and deploy do duplicate the build (~once each), which is
acceptable at this size. Tier 3's backend would outgrow Netlify's static
hosting; that migration is deliberately out of scope for v1.

## ADR 9 — Data loading: fetch → typed client → vue-query; Pinia for client state

Status: accepted (2026-08-05)

**Context.** The board loads its scenario over HTTP. In Tier 1 the "API" is
a static `public/scenario.json`, but the loading path should already have
the shape of a real client-server split so a Tier 3 NestJS backend slots in
without rework. Server state (fetched, cacheable, refetchable) and client
state (the schedule being manipulated, drag/selection) have different
lifecycles and deserve different owners.

**Decision.** Native `fetch` inside a typed client (`src/api/client.ts`)
that checks `res.ok` (typed `ApiError`) and passes every response through
`validateSchedule`, so nothing outside the client ever sees unvalidated
JSON. `@tanstack/vue-query` owns fetching, caching and retry policy via
`useScenarioQuery` (key `['scenario']`, `staleTime: Infinity` for the
static file, no retries on 4xx or validation failures — they are
deterministic). Pinia owns client state: the App-level handoff calls
`loadScenario` once per fetch, and every component below reads the store,
never the query. Alternatives considered: axios (rejected — no
interceptor or legacy-browser need), Pinia Colada (rejected — younger
library; TanStack knowledge transfers from a prior project).

**Consequences.** The boundary is explicit and testable in three layers:
client (HTTP + validation), query (caching policy), store (mutations).
Breaking the seed file surfaces a precise validation message in the UI
rather than a downstream crash. Mutations stay local in Tier 1 — dragging
a task mutates the store copy only, and refetching would discard local
moves; that is acceptable for a demo whose data resets on reload. The
evolution path is optimistic `useMutation` against a NestJS endpoint with
WebSocket-driven query invalidation, replacing only the client and the
handoff. Cost: two state containers to understand, and the server/client
state split must be policed in review (no component may read query data
directly).
