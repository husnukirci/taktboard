# CLAUDE.md — working agreement for taktboard

You are pair-building a standalone portfolio project. The process is a
deliverable: this repo will be read by senior engineers as evidence of how
its author works. Optimize for legibility over cleverness.

## Ground rules

1. **Follow PLAN.md and PHASES.md.** One phase per session: read CLAUDE.md,
   PLAN.md, and the current phase spec only. Work the phase's "In scope"
   list in order, self-review against its checklists, fix findings, open the
   phase's PR, and stop. Never start the next phase in the same session.
   Never silently expand scope; propose Tier 2/3 items, don't build them.
2. **TDD tiers are non-negotiable.** Everything in `src/domain/` and Pinia
   store actions is strict red-green-refactor: write the failing test first,
   show it fail, make it pass, refactor. Composables/selectors get tests after.
   Presentational components and pointer plumbing are covered by one smoke
   test only.
3. **Small conventional commits.** One logical change per commit,
   `type(scope): subject` (commitlint style). The git history is an artifact.
4. **ADR before load-bearing choice.** Any decision that would be expensive to
   reverse gets a short entry in `docs/decisions.md` (Nygard format: Context /
   Decision / Consequences) in the same commit.
5. **Log AI friction.** When a suggestion is wrong, when tests catch a
   generated bug, when a prompt had to be reworded — append one line to
   `docs/ai-workflow.md`. That file is written incrementally, not
   reconstructed at the end.

## Tech invariants

- Vue 3, `<script setup lang="ts">` + composition API **only**. No options
  API, no class components, no JSX.
- TypeScript strict mode; no `any`, no non-null assertions without a comment.
- State: Pinia. Domain logic lives in `src/domain/` as pure TS with **zero
  Vue imports**; the store is a thin adapter over it.
- Styling: Tailwind v4 utilities only. No component CSS files, no inline
  style objects except for computed geometry (bar positions, SVG paths).
- Dates are day-granular ISO strings (`YYYY-MM-DD`) at the domain boundary;
  all date math goes through `src/domain/dates.ts`. Never `new Date()`
  arithmetic scattered in components.
- Dependencies: finish-to-start only. Reject anything else at the type level.
- No external Gantt/timeline/chart/drag libraries. CSS grid + SVG + pointer
  events. (Pinia, vitest, testing utilities are fine.)
- Rendering: task bars are HTML in a CSS grid; dependency arrows are one SVG
  overlay layer. Keep them in sync via shared geometry utils, not
  measurement hacks.

## Definition of done for any task

Tests pass, typecheck passes, lint passes, `npm run build` succeeds, the
relevant PLAN.md checkbox can honestly be ticked, and — if the change is
user-visible — it works in the running dev server, verified before moving on.
