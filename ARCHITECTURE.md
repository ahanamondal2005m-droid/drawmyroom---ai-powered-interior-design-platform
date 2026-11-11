# DrawMyRoom — Architecture

This document describes the verified implementation after the November 2026
modularization. The application is intentionally dependency-light and runs
fully offline: no database, no external AI services, no API keys. All planning
intelligence executes in-process through `local-engine/`.

## Stack (actual, preserved)

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4, three.js, lucide-react, motion |
| Backend | Node + Express 4, executed via `tsx` (no separate build step) |
| Persistence | JSON files in `data/` (`projects.json`, `users.json`, `designs.json`, `inquiries.json`) |
| Planning engine | `local-engine/` — pure TypeScript port of [roomsolver](https://github.com/Dylanlf/roomsolver) (beam-search layout solver) plus staging / lighting / value-engineering / clearance adapters |
| Tooling | `tsc --noEmit` (typecheck), `vite build` (production build) |

There is no router library and no global state library — those are existing
conventions that were preserved, not oversights. Navigation is string state in
the `useDrawMyRoomApp` hook; data flows downward through props.

## Directory layout

```
server.ts                        # Thin entry: app assembly, mounts routers,
                                 # Vite (dev) / static (prod) integration
server/
  store.ts                       # JSON persistence: readData/writeData over <cwd>/data
  routes/
    auth.ts                      # POST /api/auth/login, /register; GET /api/auth/me
    projects.ts                  # GET/POST /api/projects; GET/PUT/DELETE /api/projects/:id
    designs.ts                   # GET/POST /api/designs; DELETE /api/designs/:id
    inquiries.ts                 # POST /api/inquiries
    layout.ts                    # /api/layout/{analyze-sketch,stage-room,
                                 #   balance-lighting,value-engineer} -> local-engine

local-engine/                    # Pure TypeScript, no Node-only imports
  staging.ts                     # stageRoom(): catalog + solver -> StagingPlan
  lighting.ts                    # balanceLighting(): photometric rebalance
  valueEngineer.ts               # valueEngineer(): budget substitutions
  clearance.ts                   # computeClearanceConflicts()/autoSnapClearance()
  roomsolver/                    # model.ts, rules.ts, scoring.ts, solver.ts (barrel: index.ts)

src/
  main.tsx                       # React root
  App.tsx                        # View-only shell: public site vs. studio, tab routing
  types/index.ts                 # All shared domain types (zero imports)
  data/
    seed.ts                      # Canonical DEFAULT_PROJECT / DEFAULT_USER
    mockData.ts                  # CATALOG_ITEMS, MATERIALS_CATALOG, DESIGNER_PROFILES
  services/
    api.ts                       # Every backend call in one place
  hooks/
    useDrawMyRoomApp.ts          # App state + actions (navigation, auth, projects)
  utils/
    format.ts                    # currencySymbolFor() and future display helpers
  components/
    public/                      # Marketing site + AuthModal (Landing, About,
                                 # HowItWorks, Features, Contact, PublicNavbar)
    studio/                      # StudioLayout + 10 workspace views
      SpatialEditorView.tsx      # 2D/3D room editing, sketch upload, AI staging
      Room2DCanvas.tsx           # Drag/rotate, live clearance recompute
      Room3DCanvas.tsx           # three.js procedural render, lighting, materials
      FurnitureCatalogView.tsx   # Catalog filters + staging tray
      MaterialsStudioView.tsx    # Material catalog, plane application
      LightingSimulationView.tsx # Diurnal solar model, AI luminaire balance
      EstimatesBoQView.tsx       # BoQ table, in-process value engineering, CSV export
      ProjectsView.tsx           # Project list + create/delete
      SavedDesignsView.tsx       # Design variations (component-local state)
      DesignerConnectView.tsx     # Designer directory + inquiry form
      SettingsView.tsx           # Currency/unit/profile settings
      DashboardView.tsx          # KPIs + module launcher

tests/
  api-characterization.mjs       # 24-step route matrix; capture/compare modes
  fixtures/                      # Frozen data snapshot + api-baseline.json

data/                            # REAL persisted state — git-tracked, never reset
vendor/roomsolver/               # Upstream provenance + port notes (MODEL_CARD.md)
```

## Request flow

```
React view (studio/*)
  -> handler in view or useDrawMyRoomApp
  -> src/services/api.ts            (fetch, /api/*)
  -> Express route (server/routes/*)
       CRUD:  -> server/store.ts -> data/<entity>.json
       layout: -> local-engine/* (in-process)
  -> JSON response (shape unchanged from the pre-refactor API)
  -> view state update
```

The Vite dev server proxies `/api/*` to the backend on port 3000
(`vite.config.ts`), so the split-process setup is transparent to the app.

## Module responsibilities

- **`server.ts`** — composition only: body parsers, router mounting, Vite
  middleware (dev) or `dist/` static serving (prod), listen. No business logic.
- **`server/routes/*`** — HTTP concerns and validation. Startup seeding is kept
  as module-level side effects in `auth.ts`/`projects.ts`, preserving the
  original `initialUsers` snapshot-fallback and empty-file reseed semantics.
- **`server/store.ts`** — JSON-file persistence with identical
  read/default/write semantics to the original monolith (synchronous,
  last-write-wins, error-tolerant).
- **`src/data/seed.ts`** — the single source of truth for the default project
  and user, shared by backend fallbacks and frontend initial state (this was
  previously two divergent ~200-line copies).
- **`src/services/api.ts`** — the only place `fetch` is called from the
  frontend. Each helper mirrors its former inline call site's semantics
  exactly: reads return parsed JSON (callers check payload fields),
  fire-and-forget mutations return the raw `Response` with `.catch` at the
  caller, and `sendInquiry` returns the raw `Response` because its caller
  checks `res.ok`.
- **`src/hooks/useDrawMyRoomApp.ts`** — navigation state, current user,
  project list, and every project mutation including backend sync. Moved
  verbatim from `App.tsx`.
- **`local-engine/*`** — pure, deterministic, synchronous planning logic.
  Browser-safe except `staging.ts`, which imports `CATALOG_ITEMS` and is used
  server-side only. No imports from `src/` beyond types and mock data, so the
  module graph is acyclic.

## Compatibility guarantees (verified, not assumed)

- All API paths, methods, status codes, and response shapes are unchanged —
  proven by `tests/api-characterization.mjs` (24/24 steps byte-identical after
  timestamp/ID normalization).
- One intentional additive delta, documented and captured in the current
  baseline: `POST /api/projects` with a partial body now fills
  `warranty`/`activeMaps` on the seeded `materialSpecs` because the shared
  seed is type-complete (`MaterialItem`), whereas the old inline server seed
  was type-invalid.
- The `/api/designs` CRUD routes are preserved even though no client code
  currently calls them (`SavedDesignsView` keeps variations in component
  state) — public API surface is not removed for internal cleanliness.
- `currencySymbolFor()` preserves the legacy ternary exactly: INR renders `₹`,
  every other code renders `$` (EUR/GBP display behavior is unchanged;
  fixing it would be a product decision).
- Budget-committed math is intentionally left as-is, including the
  visible-item filter used by the spatial editor versus the unfiltered sums
  used by catalog placement / design restore — unifying them would change
  displayed numbers and is out of scope for a structural refactor.

## Verification commands

```powershell
npm run lint          # tsc --noEmit
npm run build         # vite build (chunk-size warning is pre-existing)
node tests/api-characterization.mjs --compare tests/fixtures/api-baseline.json
node node_modules/tsx/dist/cli.mjs smoke-engine.ts   # engine smoke test
```

The characterization harness boots the server on port 3999 in an isolated temp
cwd seeded from `tests/fixtures/data/`, so the real `data/` directory is never
written to during tests.

## Known limitations (documented, deliberately not changed)

- Saved design variations live only in component state (lost on tab switch)
  despite server-side `/api/designs` storage existing.
- `Room3DCanvas` leaks GPU geometries/materials on rebuild effects (selection
  changes rebuild the furniture group without disposing).
- ContactPage and several export buttons are non-functional stubs (`alert()`).
- Dashboard category-spend tiles are hardcoded demo values.
- The `m` unit setting and EUR/GBP currencies have no downstream effect.
