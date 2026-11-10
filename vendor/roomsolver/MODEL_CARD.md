# Model Card — roomsolver (local layout model)

## Identity

- **Name:** roomsolver — furniture-layout usability grader + arrangement solver
- **Upstream:** https://github.com/Dylanlf/roomsolver (`main`, MIT License, © 2026 Dylan Fox)
- **Local copy:** `vendor/roomsolver/` (unmodified upstream Python source, kept for reference and attribution)
- **Port used by this app:** `local-engine/roomsolver/` (TypeScript port of the same algorithm, no Python runtime required)

## What the model does

The upstream project grades and *solves* furniture layouts:

1. **Geometry model** (`model.py` → `local-engine/roomsolver/model.ts`): rooms, walls
   (`N/S/E/W`), doors with quarter-circle swing polygons, windows/closet openings, and
   furniture pieces defined as `w` (width along the wall) × `d` (depth into the room)
   with per-side **clearance zones** (minimum and ideal depth, e.g. 30"/36" in front of
   a dresser for drawer pull-out).
2. **Clearance rulebook** (`rules.py` → `rules.ts`): design-standard clearances in
   inches — 36" primary walkway, 42" ideal, 30" secondary squeeze path, 18" door
   approach — plus a furniture library with typical dimensions.
3. **Usability scoring** (`scoring.py` → `scoring.ts`): a layout is *feasible* only if
   nothing overlaps, nothing blocks the door swing or an opening, and everything fits
   inside the room. Feasible layouts are graded 0–100: each pinched clearance zone adds
   penalty proportional to how much of its minimum rectangle is blocked; blocked door
   approaches and window/closet clearances are penalized; circulation analysis flags
   floor stranded behind sub-30" pinches.
4. **Beam-search solver** (`solver.py` → `solver.ts`): places the largest pieces first,
   keeps the top-N partial layouts per step, guarantees diversity by capping the beam
   per anchor placement and de-duplicating result "families", and returns the top
   arrangements ranked by score (comfort as tie-breaker).

## Port notes (differences from upstream)

- **Language:** pure TypeScript, runs in Node (backend) and the browser (live Clearance
  Engine). No Python, no shapely, no native dependencies.
- **Geometry:** all footprints and clearance zones are axis-aligned rectangles (walls
  are axis-aligned and rotations are multiples of 90°), so shapely polygon algebra is
  replaced with exact rectangle algebra via coordinate compression.
- **Door swing:** the quarter-circle swing is approximated by a fan of thin rectangles.
- **Circulation:** the shapely `buffer(-15")` erosion/dilation is approximated on a
  coarse grid, and is only computed for completed layouts (matching upstream's
  `partial=True` behavior during search).
- **Search size:** beam/step defaults are tuned smaller (`beam=160`, `step=12`) than
  upstream (`beam=400`, `step=6`) so a browser-facing HTTP request stays fast; results
  are equivalent in kind, slightly coarser.
- **Furniture library:** extended beyond the upstream nursery set with living-room,
  bedroom, dining and office pieces carrying DrawMyRoom catalog prices so the solver
  can enforce the Spatial Cost Cap.

## License

Upstream and the port are MIT licensed. The upstream license text is preserved at
`vendor/roomsolver/LICENSE`. The TypeScript port retains the same algorithm structure
and constants; attribution is given here and in `local-engine/roomsolver/*.ts` headers.

## Offline guarantees

- No network calls. No API keys. No model weights to download.
- Deterministic: the same room, furniture and seed always produce the same layout.
