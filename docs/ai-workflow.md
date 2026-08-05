# AI workflow log

Incremental friction log: one line per incident, appended in the session it
happened. Finalized as a narrative in Phase 6.

## Phase 0

- 2026-08-05: AI first generated `eslint.config.ts`; ESLint would need the extra `jiti` dependency to load a TS config, so it was replaced with `eslint.config.js` before ever running.
- 2026-08-05: Running `prettier --write .` reformatted the hand-written PLAN.md/PHASES.md specs (emphasis markers, code blocks in specs). Caught in `git diff` review; reverted and excluded planning docs via `.prettierignore`.
- 2026-08-05: vitest warned that `import viteConfig from './vite.config'` (extensionless) breaks Vite's upcoming native config loader; fixed by importing `./vite.config.ts` explicitly.
