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
