## Next.js stack compiler spec

- **target**: Next.js 15+ (App Router), TypeScript
- **goal**: Scaffold a minimal app that proxies HTTP routes to `API` concept and renders a basic UI; enable parallel agent work (components, server actions, tests) from concept specs.

### Inputs

- `specs/*.concept` (at least `API`, plus domain concepts)
- `syncs/` (optional; used to infer route patterns)
- `evals/quizzie/*` (optional demo target)

### Outputs (project skeleton)

- `package.json` with `next`, `react`, `react-dom`, `typescript`
- `next.config.js` minimal config
- `tsconfig.json` aligned with Next defaults
- `app/api/*/route.ts` route handlers mapping to `API.request/response`
- `app/(ui)/page.tsx` entry; optional `app/quiz/[quiz]/page.tsx` and `app/question/[question]/page.tsx` for quizzie eval
- `lib/sync/engine.ts` that instantiates `SyncConcept`, registers concepts, and exposes `API` proxy
- `lib/concepts/*` generated from `specs/*.concept` (or re‑export if existing)
- `tests/*` basic route tests with Vitest/Jest

### Route generation

- If `syncs/` present, parse for `API.request({ method, path })` patterns to enumerate routes; else, use a default REST set derived from domain specs (CRUD for primary sets).
- Emit corresponding `route.ts` handlers that:
  1) Normalize request into a single input map (merge query/params/body)
  2) Call `API.request({ method, path, ...input })`
  3) Await `API._waitForResponse({ request })`
  4) Return JSON

### Engine wiring

- `lib/sync/engine.ts`:
  - import engine primitives
  - instantiate concepts (generated or hand‑written)
  - register syncs (if available)
  - export `{ API }` proxy for route handlers

### UI scaffolding (optional for evals)

- Minimal pages mirroring quizzie demo: list quizzes; quiz detail; question page with activation controls
- Client components call `/api/*` routes via fetch; server components can use server actions if desired

### Tests

- Add route tests per generated endpoint to verify `200` + basic payload shape
- Include a smoke test executing a small interaction flow (create → fetch → delete)

### Generation algorithm

1) Create project files if missing (do not overwrite custom user files)
2) Copy or generate `lib/concepts/*` from `.concept` specs (preserve independence; actions and queries only)
3) Generate `lib/sync/engine.ts`
4) Generate `app/api/*/route.ts` from inferred route list
5) If `evals/quizzie` selected, add optional UI pages
6) Add tests matching endpoints

### Configuration

- Node 18+, Next 14+, Edge runtime off by default for simplicity
- Env via `.env.local` if needed; avoid external DB by default (in‑memory per current engine)

### Validation

- Build: `next build`
- Dev: `next dev`
- Test: run unit tests; log engine TRACE to confirm flows

### Regeneration contract

- Generator must be idempotent and append‑safe; never delete user code
- On conflict, emit `// GENERATED: CompilerConcept` sections for humans to merge

