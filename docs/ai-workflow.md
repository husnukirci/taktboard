# AI workflow log

How this project was built with an AI pair (Claude Code), and where that
went wrong. The one-line entries under each phase were appended in the
session they happened — they are the raw evidence, not a reconstruction.
The narratives were written in Phase 6 from those entries and the PR
descriptions.

The working agreement is in [CLAUDE.md](../CLAUDE.md): one phase per
session, strict red-green-refactor for the domain core and store actions,
self-review against per-phase checklists before every PR.

## Phase 0 — scaffold, tooling, CI

The session was asked to produce the skeleton: Vite/Vue/TS-strict/Tailwind,
lint/format/test tooling, husky + commitlint, CI, and a Netlify deploy —
no product code. Friction was all configuration: the AI's first ESLint
config was a `.ts` file that ESLint can't load without an extra dependency,
and a blanket `prettier --write .` reformatted the hand-written planning
docs. Both were caught by reading the diff, not by any tool. Lesson that
held for the whole project: generated config deserves the same diff review
as generated code.

- 2026-08-05: AI first generated `eslint.config.ts`; ESLint would need the extra `jiti` dependency to load a TS config, so it was replaced with `eslint.config.js` before ever running.
- 2026-08-05: Running `prettier --write .` reformatted the hand-written PLAN.md/PHASES.md specs (emphasis markers, code blocks in specs). Caught in `git diff` review; reverted and excluded planning docs via `.prettierignore`.
- 2026-08-05: vitest warned that `import viteConfig from './vite.config'` (extensionless) breaks Vite's upcoming native config loader; fixed by importing `./vite.config.ts` explicitly.

## Phase 1 — domain core, strict TDD

The session built the schedule engine test-first: dates, validation, graph,
propagation, selectors. This is the phase where TDD demonstrably paid for
itself: the AI's `maxDate` used `reduce` without an initial value, so its
first argument skipped validation entirely — a bug no happy-path test would
hit, surfaced by writing one more red test. Review also had to reject a
"fix" that traded a type smell for a legibility smell; the plain nested
loop won. Generated prose (error messages) needed the most human editing.

- 2026-08-05: AI's first `maxDate` used `reduce` without an initial value, so the first argument was never validated — `maxDate('garbage')` would have passed silently. Caught by writing one more red test for the single-argument case; TDD earned its keep.
- 2026-08-05: Generated error message for `eachDay` came out garbled ("from must not be before... to precedes it"); caught reading the diff before running the tests, rewritten by hand.
- 2026-08-05: Asked to remove two `as ISODate` casts in `dateRange`, AI produced an index-arithmetic version (`tasks[Math.floor(i / 2)]`) that swapped a type smell for a legibility smell; rejected and replaced with a plain nested loop.

## Phase 2 — stores and data loading

The session wired Pinia, the typed fetch client, vue-query, and the seed
scenario. The best AI moment of the project happened here: the phase spec's
"one task pre-slipped" was under-constrained (a naive slip violates the
slipped task's own FS constraints on first load), and the AI caught the
contradiction while designing the seed and proposed baseline float for the
successors — now locked in by tests. The worst reflex also happened here:
after self-review found a missing composable test, the AI committed the fix
with `--no-verify`, silently bypassing the hooks the project had just set
up. Hooks and review exist precisely so that reflex is harmless, but it is
worth naming: the tooling discipline is not innate to the model.

- 2026-08-05: Phase spec's "one task pre-slipped" is under-constrained: slipping a task 2 days naively puts its successors in violation of their FS constraints on first load. AI caught this while designing the seed and gave the slipped task's successors 2 days of baseline float instead, so exactly one task shows delay and the schedule stays consistent; the seed now carries a test asserting both properties.
- 2026-08-05: Self-review found `useScenarioQuery` shipped with no direct test despite the pragmatic tier promising "happy path + one edge" for composables; the App test covered the happy path but the no-retry-on-deterministic-failure policy was unverified. Added two tests after the fact. Separately, AI committed that fix with `--no-verify` out of reflex, bypassing husky; caught immediately and commitlint/lint/format re-run by hand — hooks exist precisely so this reflex is harmless.

## Phase 3 — static timeline render

The session rendered the board: grid, sticky headers, bars, ghosts, delay
colors. One prompt had to be reworded: the spec sanctioned only two homes
for date math, and the AI's first instinct was to create a third
(`ui/format.ts`); restating the constraint explicitly put the formatting
helpers in `geometry.ts`, keeping the "no date math in components" rule
enforceable with a one-line grep. Browser QA caught what unit tests
structurally cannot — a sticky header label scrolling out of view — which
set the pattern of ending every UI phase with a real-browser pass.

- 2026-08-05: The spec's aria-label example ("12–15 Aug") demands human date formatting, which is date math, but the phase checklist only sanctions `domain/dates` and `ui/geometry` as homes for it. AI initially reached for a separate `ui/format.ts`; reworded the constraint and the formatting/label helpers landed in `geometry.ts` instead, keeping the checklist enforceable with a one-line grep.
- 2026-08-05: First AI draft of the lane-separator loop used `lanes.indexOf(lane)` inside `v-for` — O(n²) and redundant with the index the directive already provides; caught on re-read before commit.
- 2026-08-05: Browser QA earned its keep where unit tests couldn't: at full viewport width the board looked perfect, but scrolling right showed the "March 2026" header label disappearing with its span's left edge. Fixed with a nested sticky span. Same review pass also found header row heights hard-coded in two places that had to agree (`grid-template-rows` and the day row's sticky offset) — promoted to `--hdr-*` tokens.

## Phase 4 — drag-to-reschedule

The session built the core interaction. Every unit test was green and the
feature was still broken: a Phase 3 latent stacking bug (a later task's
baseline ghost painting over an earlier bar) swallowed `pointerdown` on the
second drag, and only instrumenting pointer events in a real browser found
it. The phase also hit a genuine spec contradiction — "Escape cancels" vs.
"no document-level listeners" — resolved by focusing the bar on
`pointerdown` so an element-scoped handler catches the key; the deviation
lives as a code comment where the next reader needs it.

- 2026-08-05: All unit tests green, yet the second QA drag silently did nothing: once a task slipped, the *next* task's baseline ghost (later in DOM, same lane) painted over the dragged bar and swallowed `pointerdown`. A Phase 3 latent bug that only interaction could expose — found by instrumenting pointer events in the browser, fixed with `pointer-events-none` on ghosts. Stacking bugs live outside happy-dom's reach.
- 2026-08-05: The spec's "Escape during drag cancels" quietly conflicts with its own "no document-level listeners" rule — keyboard events follow focus, not pointer capture. Resolved by focusing the bar in `pointerdown` so an element-scoped `@keydown.esc` catches it; the deviation is a code comment, not a global listener.

## Phase 5 — dependency arrows and polish

The session added the SVG arrow layer, hover focus, and the a11y/visual
pass. The instructive failure was a measurement: the AI's first drag-frame
benchmark used the Event Timing API, looked plausible, and measured nothing
— the API silently excludes continuous events like `pointermove`. It was
replaced with a store-driven benchmark that drives the real code path. The
a11y checklist (not anyone's eyes) caught that the delay colors shipped in
Phase 3 had never met WCAG AA contrast; a ten-line luminance script settled
the token changes.

- 2026-08-05: Generated commit subject "SVG dependency arrow layer" bounced off commitlint's sentence-case rule (uppercase start); recommitted lowercase. Tiny, but the hook did its job on machine output as designed.
- 2026-08-05: First drag-frame measurement used the Event Timing API with `durationThreshold: 0` and looked done — but the API silently excludes continuous events, so pointermove (the only event that mattered) never appeared. Replaced with a store-driven benchmark: drive `updateDrag` through Pinia, await the scheduler flush, sample 40 frames under 4× CPU throttle. An AI-suggested measurement that measured everything except the target.
- 2026-08-05: The a11y checklist item caught that Phase 3's delay tokens never passed AA: white-on-emerald-500 was 2.5:1 and white-on-red-500 3.8:1 for 12px bar labels. A ten-line luminance script settled it; tokens moved to emerald-700 (5.5:1) and red-600 (4.8:1). Checklists beat eyeballs for contrast.

## Phase 6 — docs and release

This phase: the README, ADR audit, this narrative, `docs/api.md`, release
housekeeping. Mostly writing; the friction log for it is thin by nature.

- 2026-08-05: ADR audit found `decisions.md` jumped 7 → 9; ADR 8 (Tier 2 sync adapter) was planned in PLAN.md §6 but never written because its phase never ran. Added as `proposed` rather than renumbering — the gap itself was worth recording.

## Closing reflection

What the log actually shows, read cold:

- **The AI never shipped a wrong domain rule — because it was never given
  the chance.** Strict TDD meant every domain behavior had a failing test
  before implementation, and the two real logic bugs it produced
  (`maxDate`'s unvalidated first argument, the index-arithmetic refactor)
  were caught at the red-test or diff-review stage. Where discipline was
  pragmatic instead of strict, gaps did appear (the untested
  `useScenarioQuery` policy) and had to be caught by checklist.
- **Every phase with a UI shipped a bug that unit tests could not see:**
  a sticky label scrolling away, a ghost bar swallowing pointer events, a
  benchmark measuring the wrong thing, contrast failing AA. The fix was
  never "more unit tests" — it was ending every UI phase with browser QA
  against the running app, plus checklists for the things (contrast,
  listeners, layout under scroll) that eyes and tests both miss.
- **The most valuable AI contributions were adversarial readings of the
  spec,** not generated code: spotting that the seed spec was
  self-contradictory, that "Escape cancels" conflicted with "no document
  listeners". The most dangerous moments were reflexes, not reasoning —
  `--no-verify`, plausible-looking measurements. Guardrails (hooks, red
  tests, diff review) did their job precisely because they don't trust
  anyone's reflexes, human or machine.
- **What I would keep:** one phase per session with a self-contained spec
  (no context rot), the friction log written in the moment (this document
  would be fiction if reconstructed), and TDD tiers declared up front so
  "where is it safe to go fast" was a decision, not a mood.

The log is short because the sessions were short and the specs were tight.
That is the honest headline: the process work — plan, phase specs,
checklists, tests-first — did more for output quality than any prompt
wording ever did.
