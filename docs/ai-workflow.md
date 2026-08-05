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
- 2026-08-05: Self-review found `useScenarioQuery` shipped with no direct test despite the pragmatic tier promising "happy path + one edge" for composables; the App test covered the happy path but the no-retry-on-deterministic-failure policy was unverified. Added two tests after the fact. Separately, AI committed that fix with `--no-verify` out of reflex, bypassing husky; caught immediately and commitlint/lint/format re-run by hand — hooks exist precisely so this reflex is harmless.

## Phase 3

- 2026-08-05: The spec's aria-label example ("12–15 Aug") demands human date formatting, which is date math, but the phase checklist only sanctions `domain/dates` and `ui/geometry` as homes for it. AI initially reached for a separate `ui/format.ts`; reworded the constraint and the formatting/label helpers landed in `geometry.ts` instead, keeping the checklist enforceable with a one-line grep.
- 2026-08-05: First AI draft of the lane-separator loop used `lanes.indexOf(lane)` inside `v-for` — O(n²) and redundant with the index the directive already provides; caught on re-read before commit.
- 2026-08-05: Browser QA earned its keep where unit tests couldn't: at full viewport width the board looked perfect, but scrolling right showed the "March 2026" header label disappearing with its span's left edge. Fixed with a nested sticky span. Same review pass also found header row heights hard-coded in two places that had to agree (`grid-template-rows` and the day row's sticky offset) — promoted to `--hdr-*` tokens.

## Phase 4

- 2026-08-05: All unit tests green, yet the second QA drag silently did nothing: once a task slipped, the *next* task's baseline ghost (later in DOM, same lane) painted over the dragged bar and swallowed `pointerdown`. A Phase 3 latent bug that only interaction could expose — found by instrumenting pointer events in the browser, fixed with `pointer-events-none` on ghosts. Stacking bugs live outside happy-dom's reach.
- 2026-08-05: The spec's "Escape during drag cancels" quietly conflicts with its own "no document-level listeners" rule — keyboard events follow focus, not pointer capture. Resolved by focusing the bar in `pointerdown` so an element-scoped `@keydown.esc` catches it; the deviation is a code comment, not a global listener.
