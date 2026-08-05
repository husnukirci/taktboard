# AI workflow log

Incremental friction log: one line per incident, appended in the session it
happened. Finalized as a narrative in Phase 6.

## Phase 0

- 2026-08-05: AI first generated `eslint.config.ts`; ESLint would need the extra `jiti` dependency to load a TS config, so it was replaced with `eslint.config.js` before ever running.
- 2026-08-05: Running `prettier --write .` reformatted the hand-written PLAN.md/PHASES.md specs (emphasis markers, code blocks in specs). Caught in `git diff` review; reverted and excluded planning docs via `.prettierignore`.
- 2026-08-05: vitest warned that `import viteConfig from './vite.config'` (extensionless) breaks Vite's upcoming native config loader; fixed by importing `./vite.config.ts` explicitly.

## Phase 1

- 2026-08-05: AI's first `maxDate` used `reduce` without an initial value, so the first argument was never validated — `maxDate('garbage')` would have passed silently. Caught by writing one more red test for the single-argument case; TDD earned its keep.
- 2026-08-05: Generated error message for `eachDay` came out garbled ("from must not be before... to precedes it"); caught reading the diff before running the tests, rewritten by hand.
- 2026-08-05: Asked to remove two `as ISODate` casts in `dateRange`, AI produced an index-arithmetic version (`tasks[Math.floor(i / 2)]`) that swapped a type smell for a legibility smell; rejected and replaced with a plain nested loop.

## Phase 2

- 2026-08-05: Phase spec's "one task pre-slipped" is under-constrained: slipping a task 2 days naively puts its successors in violation of their FS constraints on first load. AI caught this while designing the seed and gave the slipped task's successors 2 days of baseline float instead, so exactly one task shows delay and the schedule stays consistent; the seed now carries a test asserting both properties.
