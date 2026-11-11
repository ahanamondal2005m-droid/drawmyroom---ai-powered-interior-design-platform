# DrawMyRoom — AI-Powered Interior Design Platform (Fully Local)

Transform your room sketch into an interactive 3D dream space with precision
spatial clearance, curated architectural catalog, materials studio, lighting
simulation, and BoQ budget estimates.

**Everything runs locally and offline — no API keys, no cloud AI.** All
planning intelligence comes from `local-engine/`: a pure TypeScript port of
[roomsolver](https://github.com/Dylanlf/roomsolver) (MIT © 2026 Dylan Fox) — a
geometry-driven furniture layout solver with clearance zones, door-swing
polygons, usability scoring, and a beam-search solver. See
[vendor/roomsolver/MODEL_CARD.md](vendor/roomsolver/MODEL_CARD.md) for
provenance and port notes.

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

The backend API serves on http://localhost:3000 and the frontend dev server on
http://localhost:5173 (with `/api` proxied to the backend). No `.env` keys are
required.

## Project Structure

```
server.ts               # Express entry point (thin: mounts routers, serves Vite/dist)
server/routes/          # API route modules (auth, projects, designs, inquiries, layout)
server/store.ts         # JSON-file persistence (data/*.json)
local-engine/           # Local planning engine (staging, lighting, clearance, roomsolver)
src/
  components/public/    # Marketing pages + auth modal
  components/studio/    # Studio workspace views
  services/api.ts       # Central frontend HTTP client
  hooks/                # Application state (useDrawMyRoomApp)
  data/                 # Canonical seed + catalog/mock data
  utils/                # Shared formatting helpers
  types/                # Domain types
tests/                  # API characterization harness + frozen fixtures
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full module map, request flow,
and compatibility guarantees.

## Verify

```bash
npm run lint            # TypeScript check (tsc --noEmit)
npm run build           # Production frontend build
node tests/api-characterization.mjs --compare tests/fixtures/api-baseline.json
node node_modules/tsx/dist/cli.mjs smoke-engine.ts   # Local engine smoke test
```

The characterization harness exercises every API route against a frozen
baseline using an isolated copy of the data directory — it never touches
`data/`, which holds real persisted state.
