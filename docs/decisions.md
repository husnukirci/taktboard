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
