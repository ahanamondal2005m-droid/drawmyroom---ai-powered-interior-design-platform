# DrawMyRoom — Local Run Handoff

**Last updated:** 2026-11-10
**Status:** Backend and frontend are running and verified. **All planning intelligence now runs 100% locally and offline — Gemini has been removed entirely.**

---

## 1. Live URLs

| Service | URL | Port |
| --- | --- | --- |
| Frontend (Vite dev server) | http://localhost:5173 | 5173 |
| Frontend (loopback form) | http://127.0.0.1:5173 | 5173 |
| Backend API (Express) | http://localhost:3000 | 3000 |
| Backend API (loopback form) | http://127.0.0.1:3000 | 3000 |

The frontend proxies every `/api/*` request to the backend on port 3000, so opening
http://localhost:5173 is enough for normal use. Opening port 3000 directly serves the
API only (no HTML) in this split-process setup.

Quick health check:

```powershell
curl.exe -s -o NUL -w "backend=%{http_code}`n" http://127.0.0.1:3000/api/projects
curl.exe -s -o NUL -w "frontend=%{http_code}`n" http://127.0.0.1:5173/
```

Expected: `backend=200` and `frontend=200`.

Current listeners (PIDs change on every restart):

```powershell
Get-NetTCPConnection -LocalPort 3000,5173 -State Listen |
  Select-Object LocalPort,OwningProcess | Format-Table
```

---

## 2. Project location

```
C:\Users\ahana\OneDrive\Desktop\drawmyroom-–-ai-powered-interior-design-platform
```

**Important:** the folder name contains an en-dash (`–`, U+2013), not a hyphen.
Always use quotes or the literal path. Some tools mis-handle this character; see
section 9 for the short-path caveat.

---

## 3. What was done (summary)

### Phase 1 — local run setup

1. The machine had **no Node.js or npm installed**. Installed a portable Node runtime
   under the OpenCode temp directory (nothing global was changed).
2. Installed all project dependencies with `npm install` and generated
   `package-lock.json`.
3. Fixed an `esbuild` / Vite 8 peer-dependency conflict.
4. Added a dedicated frontend port (5173) plus an `/api` proxy to the backend.
5. Added an API-only mode to the backend (`SERVE_FRONTEND=false`) so frontend and
   backend can run as two separate processes.
6. Fixed a real data-persistence bug in project creation.
7. Added a favicon and removed the favicon 404.

### Phase 2 — Gemini removed, replaced by a local layout engine

1. **Removed the Gemini API completely**: no `@google/genai` dependency (npm dropped
   38 packages), no `GEMINI_API_KEY` anywhere, no `aiUsed` / fallback-tier logic.
   The old `/api/gemini/*` routes are gone (they now 404 by design).
2. **Ported [roomsolver](https://github.com/Dylanlf/roomsolver)** (MIT © 2026 Dylan
   Fox) — a geometry-driven furniture layout solver — from Python to pure TypeScript
   as `local-engine/roomsolver/`. Upstream source is vendored unmodified in
   `vendor/roomsolver/` with `MODEL_CARD.md` (provenance + port notes).
   Port substitutions: shapely → rect algebra, door swing → 16-rect fan,
   circulation buffer → 6″ grid flood-fill. Search defaults `beam=160, step=12`.
3. **Built DrawMyRoom adapters** in `local-engine/` that keep the old Gemini response
   shapes (`analysis`, `stagingPlan`, `lightingBalance`, `recommendation`) minus the
   `aiUsed` flag, so the frontend needed only endpoint/label changes.
4. **Renamed the endpoints** `/api/gemini/*` → `/api/layout/*` (4 routes) and rewired
   every frontend fetch.
5. **Made the features real, not narrative**: staging now returns ready-to-apply
   `placements` + `skipped` reasons; the 2D blueprint runs a live clearance engine
   during drags and settle-recomputes conflicts; Estimates/BoQ computes the value-
   engineering card, clearance score, cost-share donut and catalog lead times live.
6. Verified end-to-end in headless Chrome (all tabs, 2D/3D/walkthrough, interactive
   staging → placement → budget → lighting → estimates flow) with zero console errors
   and zero failed requests.

---

## 4. Environment / toolchain

### Node.js

No system Node was available, so a portable build is used:

```
C:\Users\ahana\AppData\Local\Temp\opencode\nodefresh\node-v26.13.0-win-x64
```

- Node: **v26.13.0**
- npm: **11.20.0**
- Executables: `node.exe`, `npm.cmd`, `npx.cmd` inside that folder.

Every command below prepends that folder to `PATH`. If you open a fresh terminal and
`node -v` fails, add it first:

```powershell
$nodeDir = Join-Path $env:TEMP 'opencode\nodefresh\node-v26.13.0-win-x64'
$env:PATH = "$nodeDir;$env:PATH"
node -v
```

### Installed dependency versions (resolved)

| Package | Version |
| --- | --- |
| react | 19.3.1 |
| react-dom | 19.3.1 |
| vite | 8.3.7 |
| @vitejs/plugin-react | 6.3.0 |
| tailwindcss | 4.3.5 |
| @tailwindcss/vite | 4.3.5 |
| typescript | 7.0.2 |
| tsx | 4.23.15 |
| express | 4.22.3 |
| three | 0.187.0 |
| @types/three | 0.187.0 |
| dotenv | 17.4.2 |
| lucide-react | 0.546.0 |
| motion | 12.43.0 |
| esbuild | 0.28.2 |
| autoprefixer | 10.6.2 |

(`@google/genai` was removed in phase 2.)

### Environment variables

There is **no `.env` or `.env.local`** in the project. Only `.env.example` exists.

| Variable | Purpose | Current state |
| --- | --- | --- |
| `PORT` | Backend port | Set to `3000` when launching |
| `SERVE_FRONTEND` | `false` = API only | Set to `false` when launching |
| `API_URL` | Vite proxy target | Unset; defaults to `http://localhost:3000` |

**No API keys of any kind are needed.** Everything — layout solving, staging,
lighting balance, value engineering, clearance checks — runs in-process via
`local-engine/`. The app works fully offline.

---

## 5. The local layout engine

### Layout

```
local-engine/
├── roomsolver/          # pure TypeScript port of Dylanlf/roomsolver (MIT)
│   ├── model.ts         #   rect algebra, room shells, furniture footprints, zones
│   ├── rules.ts         #   door-swing rect fan, egress, circulation grid
│   ├── scoring.ts       #   usability scoring (zones, door, circulation penalties)
│   ├── solver.ts        #   beam-search wall placement (beam=160, step=12)
│   └── index.ts         #   public API
├── clearance.ts         # browser-safe synchronous clearance engine
├── staging.ts          # staging adapter (server-side; imports src/data/mockData)
├── lighting.ts          # photometric + circadian balance adapter
└── valueEngineer.ts     # BoQ substitution adapter
vendor/roomsolver/       # upstream Python source, unmodified, + MODEL_CARD.md
```

### How the pieces fit

- **`staging.ts`** turns a room envelope + budget cap + style into a solved
  arrangement: wall pieces via the beam search (anchored to walls), center pieces
  around the anchors, everything checked against door swing, the egress corridor,
  pair pinches, clearance zones and the spatial cost cap. It returns the old
  `stagingPlan` shape (`styleName`, `fitScore`, `conceptSummary`,
  `recommendedLayout`, `colorPalette`, `materialRecommendations`) **plus**
  ready-to-apply `placements: PlacedObject[]` and `skipped` (name + reason).
  The room shell matches the 2D blueprint drawing: 36″ door on the S wall near the
  E corner, blockable window bay on the N wall, and the egress corridor drawn
  1.5 ft off the west wall is modeled as a fixed fixture so nothing is ever staged
  across it. A coffee table is placed ~16″ off the sofa on its centerline.
  Placed objects get ids `stg_NN`; wall rotation map S:0, W:90, N:180, E:270;
  `PlacedObject.position` is the **center** in feet.
- **`clearance.ts`** is browser-safe (no Node imports, synchronous) so the frontend
  imports it directly from Vite: `computeClearanceConflicts(dimensions, objects,
  egressInches, { circulation })` returns per-object conflicts (overlap, door
  swing, egress corridor, pinch < 12″, zone/circulation notes) plus a 0–100 score;
  `autoSnapClearance(...)` finds a nearby conflict-free position for one object.
  Circulation analysis is the expensive grid flood-fill — pass
  `{ circulation: false }` for live drag feedback, `true` after the drag settles.
- **`lighting.ts`** computes daylight contribution from the diurnal time, rebalances
  fixtures to the target lumens, and derives a circadian score/status.
- **`valueEngineer.ts`** scans the local catalog (`CATALOG_ITEMS`) for cheaper
  same-category substitutions whose footprint stays within 0.7–1.43× of the
  original (so clearance solutions stay valid) and reports savings/lead deltas.

### Endpoints (server.ts)

All four old Gemini routes became local routes; responses keep the previous shape
minus `aiUsed`, plus an `engine` tag:

| Method | Route | Purpose | Engine |
| --- | --- | --- | --- |
| POST | `/api/layout/analyze-sketch` | Room envelope analysis (aspect-ratio room-type suggestion, volumes, door/window inventory) | local geometric |
| POST | `/api/layout/stage-room` | Staging plan **with applicable placements + skipped reasons** | local-roomsolver |
| POST | `/api/layout/balance-lighting` | Luminaire rebalance + circadian compliance | local-photometrics |
| POST | `/api/layout/value-engineer` | BoQ substitution recommendation (uses `CATALOG_ITEMS`) | local-value-engineer |

`/api/gemini/*` intentionally returns **404** now — if you see 404s for those
paths, the browser is running a stale cached bundle; hard-refresh.

### Frontend integration

- `src/components/studio/SpatialEditorView.tsx` — fetches `/api/layout/*`; on a
  staging response it **applies** `placements` via `onUpdateProject` (recomputing
  `budget.committed`), reports skipped pieces in the alert, and uses the real
  `autoSnapClearance` for the "Auto-Snap Clearance" action. Labels say
  "LOCAL STAGING ENGINE / ROOMSOLVER CORE", "Local Engine Vectorizing Sketch…".
- `src/components/studio/Room2DCanvas.tsx` — new `onUpdateObjects` bulk prop; drag
  handler runs live clearance checks (`circulation:false`); a settle-time effect
  recomputes all conflict flags (`circulation:true`). Banner/corridor labels use
  the configured egress width.
- `src/components/studio/LightingSimulationView.tsx` — `/api/layout/balance-lighting`
  + "Auto-Balance Lumens (Local Engine)".
- `src/components/studio/EstimatesBoQView.tsx` — imports the local engine directly:
  live VE card with swap toggle applied to rows, Spatial Integrity KPI from
  `computeClearanceConflicts`, computed cost-share donut, catalog-derived
  procurement window.
- `HowItWorksPage.tsx` / `FeaturesPage.tsx` — marketing copy no longer mentions
  Gemini; it describes the offline local engine.

### Performance

A full staging solve runs in **~95–300 ms** server-side (18×14 ft room). Room-type
sweep: Living Room fitScore 76 (crowded-by-cost-cap), Bedroom/Dining/Office 100;
an 8×6 ft room degrades gracefully to a single piece with skip reasons instead of
throwing.

---

## 6. How to start and stop

### Recommended: two separate processes

Run these from the project root in **two** PowerShell terminals.

**Terminal 1 — backend (API only, port 3000):**

```powershell
$nodeDir = Join-Path $env:TEMP 'opencode\nodefresh\node-v26.13.0-win-x64'
$env:PATH = "$nodeDir;$env:PATH"
$env:PORT = '3000'
$env:SERVE_FRONTEND = 'false'
node node_modules/tsx/dist/cli.mjs server.ts
```

Expected output: `Frontend disabled (SERVE_FRONTEND=false); serving API only.`
then `DrawMyRoom Studio running on http://0.0.0.0:3000`.

**Terminal 2 — frontend (Vite, port 5173):**

```powershell
$nodeDir = Join-Path $env:TEMP 'opencode\nodefresh\node-v26.13.0-win-x64'
$env:PATH = "$nodeDir;$env:PATH"
node node_modules/vite/bin/vite.js --port 5173 --host 127.0.0.1
```

Expected output includes `Local: http://127.0.0.1:5173/`.

Vite takes roughly 10–30 seconds on first start because it optimizes dependencies.
Do not assume it failed if the port is not open immediately.

### Detached launchers (survive terminal/agent restarts)

These are the scripts used to keep both servers alive independently of OpenCode:

- `C:\Users\ahana\AppData\Local\Temp\opencode\run-backend.ps1`
- `C:\Users\ahana\AppData\Local\Temp\opencode\run-frontend.ps1`

They auto-detect the project folder, `Set-Location -LiteralPath` to the real Unicode
path, prepend the portable Node folder to `PATH`, set the env vars, and redirect
output to:

- `C:\Users\ahana\AppData\Local\Temp\opencode\logs\backend.out.log`
- `C:\Users\ahana\AppData\Local\Temp\opencode\logs\frontend-live2.out.log`

Launch both detached (PowerShell):

```powershell
$b = ([wmiclass]'Win32_Process').Create(
  'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\ahana\AppData\Local\Temp\opencode\run-backend.ps1"')
$f = ([wmiclass]'Win32_Process').Create(
  'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\ahana\AppData\Local\Temp\opencode\run-frontend.ps1"')
"backend pid=$($b.ProcessId) ret=$($b.ReturnValue)"
"frontend pid=$($f.ProcessId) ret=$($f.ReturnValue)"
```

Both should report `ret=0`. Then wait ~10 s (backend) and ~30 s (frontend) before
checking the URLs.

### Stop everything

```powershell
foreach ($port in 3000, 5173) {
  Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
}
```

### Restart the backend only (after editing `server.ts` or `local-engine/**`)

The backend does **not** hot-reload (`tsx` is run without `watch`). Kill the listener
on 3000 and relaunch it. The frontend keeps running (Vite hot-reloads its own
frontend code — including frontend imports from `local-engine/`).

```powershell
$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($conn) { Stop-Process -Id $conn.OwningProcess -Force; Start-Sleep -Seconds 2 }
([wmiclass]'Win32_Process').Create('powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Users\ahana\AppData\Local\Temp\opencode\run-backend.ps1"') | Out-Null
```

Wait ~10 s, then check `backend.out.log`.

### Combined single-port mode (alternative)

```powershell
$env:PATH = "$env:TEMP\opencode\nodefresh\node-v26.13.0-win-x64;$env:PATH"
npm run dev
```

This serves UI + API together on http://localhost:3000. It is slower to start and less
convenient for frontend work, but it is the original project behavior.

---

## 7. API reference

All routes are under `/api`. Via the frontend they are reachable at
`http://localhost:5173/api/...` thanks to the proxy.

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/register` | Register |
| GET | `/api/auth/me` | Current session user |
| GET | `/api/projects` | List projects |
| GET | `/api/projects/:id` | Get one project |
| POST | `/api/projects` | Create project (preserves client id) |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/designs/:projectId` | Saved designs for a project |
| POST | `/api/designs` | Save a design |
| DELETE | `/api/designs/:id` | Delete a design |
| POST | `/api/inquiries` | Contact / designer inquiry |
| POST | `/api/layout/analyze-sketch` | Room envelope analysis (local engine) |
| POST | `/api/layout/stage-room` | Staging plan with placements (local roomsolver) |
| POST | `/api/layout/balance-lighting` | Lighting rebalance (local photometrics) |
| POST | `/api/layout/value-engineer` | BoQ value engineering (local catalog) |

### Persistence

JSON files, read/written by `readData()` / `writeData()` in `server.ts`:

```
data/projects.json   — room projects
data/designs.json    — saved designs
data/inquiries.json  — contact form submissions
data/users.json      — registered users
```

The `data/` folder is created automatically on startup if missing. Files are written
synchronously and are safe to inspect or hand-edit while the backend is stopped.

Default seeded project id: `proj_default_loft` ("Modern Loft Living Room", 18×14 ft,
$2,720 committed / $2,200 cap — intentionally over cap and spatially conflicted so the
staging flow has something to fix; its 3 red conflict flags are recomputed live by
the clearance engine whenever the 2D view loads).

### Example smoke tests

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/projects | Format-Table id,name
Invoke-RestMethod http://127.0.0.1:3000/api/auth/me

# Local layout engine: staging (returns placements + skipped + fitScore)
Invoke-RestMethod -Uri http://127.0.0.1:3000/api/layout/stage-room -Method Post `
  -ContentType application/json -Body '{"roomType":"Living Room","dimensions":{"lengthFt":18,"widthFt":14,"ceilingHeightFt":10},"budgetCap":2200,"stylePreference":"Japandi Warm"}'

# Local value engineering against the catalog
Invoke-RestMethod -Uri http://127.0.0.1:3000/api/layout/value-engineer -Method Post `
  -ContentType application/json -Body '{"items":[{"id":"obj_1","name":"Noguchi Rudder Coffee Table","category":"Tables & Desks","modelType":"table","price":760,"dimensions":{"lengthIn":48,"widthIn":24},"leadTime":"5-7 business days"}],"currentTotal":760,"budgetCap":2200}'

# Old Gemini routes must 404
Invoke-WebRequest -Uri http://127.0.0.1:3000/api/gemini/stage-room -Method Post -UseBasicParsing
```

---

## 8. Verification evidence

Verified with headless Chrome via the DevTools Protocol at 1440×1000 (scripts and raw
results in `C:\Users\ahana\AppData\Local\Temp\opencode\verify\` — `check2.mjs`,
`check3.mjs`, `check4.mjs`, results in `results2/3/4.json`).

### Pages

- Landing page renders the hero and all marketing sections.
- Public navigation works: Home, How It Works, Features, About, Contact.
- "Open Studio" enters the studio without errors.

### Studio modules (all load, zero console errors)

1. Dashboard
2. Spatial Editor (2D/3D)
3. Furniture Catalog
4. Materials Studio
5. Lighting Simulation
6. Estimates & BoQ Specs
7. My Projects
8. Saved Designs
9. Designer Connect
10. Settings

### Rendering

- **2D Blueprint:** renders as SVG (48 SVG nodes observed). This is expected; the 2D
  view is vector-based and intentionally does **not** use `<canvas>`.
- **3D Isometric:** one WebGL canvas, 420×713 backing store, non-blank pixel data
  (average brightness ≈ 41/255), ~105 KB PNG data URL.
- **Walkthrough:** WebGL canvas present and rendering.

### Interactive local-engine flow (check4.mjs)

With the shipped demo project (18×14 ft, $2,200 cap, 5 objects, 3 clearance
conflicts, 124% committed):

- Baseline: 5 objects on the blueprint, 3 red conflict rings, "Auto-Snap Clearance
  (36″)" banner offered.
- Clicked **Japandi Warm**: alert "Local Staging Plan Applied: Japandi Warm —
  usability 76/100… 2 pieces placed… Skipped by the cost cap / spatial fit: …",
  blueprint replaced with the solver's 2 placements, **0 conflict rings**, budget
  recomputed to $1,919 / 87% committed, conflict banner gone.
- Lighting tab → **Auto-Balance Lumens (Local Engine)**: feedback "Rebalanced 3
  luminaires to 2,737 lm (67% of the target supplied by daylight at 16:45)…".
- Estimates & BoQ tab: Spatial Integrity KPI "2 / 2 Verified", "Local Clearance
  Engine • Score 76/100", procurement window "1–14 Business Days" resolved from
  catalog lead times, computed cost-share donut (68% / 32%), local VE card.
- **0 console errors, 0 failed requests, 0 HTTP responses ≥ 400** for the entire
  flow. The demo project data was restored afterwards (the run's PUTs persisted
  correctly — that is the auto-save working).

### API

- All four `/api/layout/*` endpoints return `success: true` with real computed data
  (`stage-room` fitScore 76, 3 placements at a $2,500 cap / 2 placements at $2,200;
  `value-engineer` computes the Noguchi Rudder → Tivoli swap, $140).
- `/api/gemini/*` → 404 (expected).
- Create → PUT → DELETE round trip with a client-supplied id → all succeed.
- `GET /api/designs/proj_default_loft` → 200. `POST /api/inquiries` → 200.

### Lint / typecheck

```powershell
npm run lint    # tsc --noEmit
```

Passes with no errors (`local-engine/` is type-checked automatically — tsconfig has
no `include`, so everything outside `dist` compiles).

---

## 9. Known caveats and gotchas

1. **En-dash in the path.** Some shell/tooling combinations fail on the `–`. The
   PowerShell launchers avoid this by resolving the path at runtime with
   `Get-ChildItem -LiteralPath` + `Set-Location -LiteralPath`.
2. **Do not use the 8.3 short path (`DRAWMY~1`) for Vite.** It was tried and Vite
   rejected its own files with
   `The request id "...\DRAWMY~1\index.html" is outside of Vite serving allow list`.
   Always use the real Unicode path.
3. **`$ErrorActionPreference = 'Stop'` breaks these launchers.** Vite writes its
   config warning to stderr; PowerShell treats that as a terminating error when
   `Stop` is set, killing the process. The scripts use `Continue`.
4. **Backend has no hot reload.** Restart it after editing `server.ts` or anything
   in `local-engine/` that the server imports (`staging.ts`, `lighting.ts`,
   `valueEngineer.ts`). Frontend-only changes (and `clearance.ts`, which the
   browser imports directly) hot-reload through Vite.
5. **Vite startup is slow on first run** (dependency optimization). Wait before
   declaring failure; check the log file.
6. **`localhost` vs `127.0.0.1`.** Both work. The frontend launched with
   `--host 127.0.0.1`, so it is reachable on loopback only, not from other machines.
7. **Data is file-based.** There is no database. Concurrent writes are last-write-wins.
8. **`npm run dev` is combined mode** on port 3000; the split setup uses the two
   explicit commands above.
9. **`data/projects.json` may contain real user work.** Do not truncate it while
   debugging; back it up first. (A verified pre-migration backup exists at
   `%TEMP%\opencode\verify\projects-backup.json`.)
10. **The app is not a git repository** (`git status` is unavailable). No version
    control safety net exists.
11. **`analyze-sketch` is geometric, not vision.** The original Gemini route did
    multimodal image parsing; the local route derives the envelope from the
    manual/handset dimensions and aspect ratio (image upload still previews, and
    dimensions remain editable in the Spatial Envelope panel). This is the honest
    offline trade-off.
12. **Demo lead-time coverage.** The seeded project's legacy item names only
    partially match `CATALOG_ITEMS`, so the BoQ procurement window resolves for the
    rows that match (solver-staged rows always match, since they come from the
    catalog). The card states the resolved count.

---

## 10. Quick troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `node: command not found` | Portable Node not on `PATH` | Prepend `%TEMP%\opencode\nodefresh\node-v26.13.0-win-x64` |
| Frontend returns 403 / "outside serving allow list" | Launched from the `DRAWMY~1` short path | Use the real Unicode project path |
| Frontend down, backend up | Vite crashed or still optimizing | Read `frontend-live2.out.log`, relaunch, wait 30 s |
| Backend connection refused | Not started or crashed | Read `backend.out.log`, relaunch |
| `PUT /api/projects/:id` → 404 | Old backend process without the fix | Restart the backend |
| 404 on `/api/gemini/*` in the browser | Stale cached frontend bundle | Hard-refresh the page (Ctrl+Shift+R) — the app now calls `/api/layout/*` |
| Staging alert says pieces were skipped | The spatial cost cap / door swing / corridor genuinely excluded them | Raise the budget cap or room size, or move pieces manually |
| Port already in use | Stale process | Kill the listener (section 6) and relaunch |

Log locations:

```
C:\Users\ahana\AppData\Local\Temp\opencode\logs\backend.out.log
C:\Users\ahana\AppData\Local\Temp\opencode\logs\frontend-live2.out.log
```

---

## 11. Suggested next steps

- Initialize git (`git init`) and commit the current state, including
  `package-lock.json`, `local-engine/`, `vendor/roomsolver/` and `handoff.md`.
- Consider replacing file-based JSON persistence with SQLite if multi-user use grows.
- Consider running the backend with `tsx watch` for automatic reloads during development.
- Add a `dev:api` / `dev:web` script pair to `package.json` so the split setup is one
  command per process.
- Optional engine upgrades: richer fixture modeling (radiators, columns), rug-zone
  pairing, multi-door shells — the solver already accepts arbitrary fixtures/doors.
