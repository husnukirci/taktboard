# taktboard — build plan

A standalone portfolio project: a collaborative-style construction schedule
timeline board with delay propagation. Vue 3, TypeScript, Tailwind, Pinia,
deployed to Netlify with GitHub Actions CI.

Scope is tiered so the project is releasable at every milestone: Tier 1 is a
complete, shippable v1; Tiers 2 and 3 are follow-ups, not prerequisites.

---

## 1. Goal

1. A credible domain core (schedule model + delay propagation) built strictly
   test-first, framework-free.
2. A clean, interactive timeline UI: drag-to-reschedule, dependency arrows,
   baseline vs. actual comparison, visible downstream ripple.
3. The engineering process as a first-class deliverable: tiered plan, ADRs,
   CLAUDE.md working agreement, documented AI workflow, CI, early deploy.

Non-goal: production readiness. This is a focused demo of domain modeling,
UI craft, and process — and says so.

## 2. Domain in one paragraph

A construction project is a set of **trades** (electrics, drywall, plumbing, …),
each owning **tasks** placed on a day-granular timeline. Tasks have a
**baseline** (planned start/duration) and a **current** schedule. Tasks are
linked by **finish-to-start dependencies**. When a task slips, all transitive
successors that would now start before their predecessor finishes are pushed
right. **Delay** per task = current start − baseline start (days). The board
makes slippage and its ripple visible at a glance.

## 3. Tiers

### Tier 1 — v1 release

- [x] Scaffold: Vite + Vue 3 + TS strict + Tailwind v4 + Pinia
- [x] Tooling: ESLint (flat) + Prettier + vitest + happy-dom + lint-staged/husky
- [x] CI: GH Actions — lint, typecheck, test, build on every push/PR
- [x] Netlify deploy live from the first commit (deploy-first rule)
- [x] Domain core (pure TS, strict TDD, no Vue imports):
  - [x] types: `Task`, `Trade`, `Dependency` (FS only), `Schedule`
  - [x] date utils (day-granular; calendar days, no working-day calendar)
  - [x] `propagateDelays(schedule, movedTaskId)` — topological pass, pushes
        successors right, returns changed set
  - [x] per-task delay vs. baseline selector
- [x] Pinia store wrapping the domain core (actions: `moveTask`, `reset`,
      `loadScenario`)
- [x] Data loading: `public/scenario.json` served over HTTP; typed
      `src/api/client.ts` (native fetch, `res.ok` check, domain validation at
      the boundary); `@tanstack/vue-query` `useQuery` feeding `loadScenario`;
      loading / error / empty states on the board
- [x] Seed scenario: realistic small project (~4 trades, ~12 tasks, 1 baked-in
      slip so the board is interesting on first load) — lives in
      `public/scenario.json`
- [x] Timeline UI:
  - [x] day-column header + one lane per trade (CSS grid)
  - [x] task bars positioned by grid column; baseline shown as ghost bar
  - [x] SVG overlay for dependency arrows
  - [x] delay highlighting: on-time / minor slip (amber) / major slip (red)
  - [x] drag horizontally, snap to day, drop → store action → visible ripple
- [x] Docs: README (arch diagram, quick start), `docs/decisions.md` (ADRs),
      `CLAUDE.md`, `docs/ai-workflow.md`

### Tier 2 — follow-ups

- [ ] Multi-tab sync via `BroadcastChannel` behind a `SyncAdapter` interface
      (ADR: interface shaped so a NestJS WebSocket gateway can replace the
      adapter without touching the store)
- [ ] JSON import/export of the schedule
- [ ] Critical-path highlighting
- [ ] Live ripple preview during drag (propagation is pure — cheap to preview)

### Tier 3 — stretch

Backend (NestJS + Prisma + PostgreSQL), persistence, auth, undo/redo,
working-day calendars, resource conflicts, virtualization, mobile layout.
Listed so cuts are deliberate and discussable, not accidental.

## 4. Build order

Detailed, self-contained phase specs live in **PHASES.md**. Workflow: one
phase = one Claude Code session = one PR. Each session reads only CLAUDE.md,
PLAN.md, and its phase spec; implements; self-reviews against the phase and
global checklists; fixes findings; opens the PR and stops. The author merges,
then starts the next phase in a fresh session.

| Phase | Work | PR |
| --- | --- | --- |
| P0 | Scaffold, tooling, CI, hello-world on Netlify | chore(scaffold) |
| P1 | Domain core, strict TDD (types → dates → validate → graph → propagation) | feat(domain) |
| P2 | Pinia stores, typed api client, vue-query scenario loading | feat(state) |
| P3 | Static timeline render: grid, bars, ghosts, delay colors | feat(ui) |
| P4 | Drag-to-reschedule with ripple + keyboard equivalent | feat(interaction) |
| P5 | Dependency arrows, hover focus, a11y + visual polish | feat(ui) |
| P6 | Docs, ADR audit, v1 release | docs |

Each phase lands green (tests, typecheck, lint, build) before the next starts.

## 5. TDD tiers

- **Strict (red-green-refactor, no exceptions):** domain core (`src/domain/`),
  store actions.
- **Pragmatic (test after, happy path + one edge):** composables, selectors,
  api client.
- **Untested by design:** presentational components, drag pointer plumbing —
  covered by a single smoke test and manual QA. Written down here so it's a
  decision, not a gap.

## 6. ADRs to write (short-form Nygard)

1. Vue 3 `<script setup>` + composition API only — one idiom for a small codebase
2. Pinia over hand-rolled reactive stores — devtools, test isolation, team
   legibility; domain stays pure so the store is a replaceable adapter
3. Domain core as pure TS module, framework-free — testability, portability
4. Timeline as CSS grid + SVG overlay — no canvas, no Gantt library, why
5. Day-granular calendar dates; working-day calendars out of scope
6. Delay propagation: eager topological push, server-authoritative-ready
7. Netlify + GH Actions for deploy and CI
8. (Tier 2) `SyncAdapter` + BroadcastChannel as WebSocket stand-in
9. Data loading: native `fetch` → typed client with boundary validation →
   `@tanstack/vue-query` for server state, Pinia for client state; static
   `public/scenario.json` stands in for the API. Alternatives considered:
   axios (rejected — no interceptor/legacy need), Pinia Colada (rejected —
   younger; TanStack knowledge transfers from prior project). Mutations stay
   local in Tier 1; evolution path is optimistic `useMutation` against a
   NestJS endpoint with WebSocket-driven query invalidation.

## 7. Definition of done (Tier 1)

Fresh clone → `npm ci && npm run dev` works; CI green; Netlify URL live;
a visitor can drag one task and watch three successors slip; every domain
behavior has a test that fails when the behavior is broken; docs read in
under ten minutes.
