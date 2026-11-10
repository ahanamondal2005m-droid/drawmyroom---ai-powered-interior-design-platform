# roomsolver

Describe a room and some furniture, and roomsolver searches wall placements,
**grades each layout for real-world usability** — can you open the dresser
drawers, reach into the crib, get in and out of the bed, walk to the changing
table without squeezing past anything — and draws the best options top-down.

It was born from planning a nursery, but it's a general "does this furniture
arrangement actually work" grader. Everything is in **inches**.

![Example graded layout](docs/example_layout.png)

*Green = floor you can reach from the door without squeezing; hatching = each piece's required clearance; the title shows the 0–100 usability score.*

## Install

```bash
pip install -e .           # installs roomsolver + shapely + matplotlib
```

(Or just `pip install -r requirements.txt` if you'd rather not install the package.)

## Try it

```bash
cd examples
python demo.py             # search the room in room_config.py, print + draw the best layouts
python evaluate.py         # grade ONE specific arrangement you write by hand
```

`demo.py` writes `top_layouts.png` (grid of the best options) and
`best_layout.png` (the winner, with the reachability overlay). `evaluate.py`
writes `my_layout.png`. The first `solve()` takes ~30–45s — that's the beam
search over placements, not a hang.

## Layout of the repo

```
roomsolver/          the package
  model.py           geometry: Room, Door, Opening, Furniture, Zone (Shapely under the hood)
  scoring.py         grade(room, pieces) -> score 0-100 + plain-English issues
  solver.py          solve(room, furniture) -> ranked best layouts (beam search)
  render.py          top-down drawings
  rules.py           clearance constants + a starter furniture library
examples/
  room_config.py     a sample room + furniture — copy & edit this for your room
  demo.py            search and draw the best layouts
  evaluate.py        grade one arrangement you specify
docs/                the README screenshot
```

## Describing your room

Copy `examples/room_config.py` and edit it. Origin `(0,0)` is a corner; `x` runs
along the bottom/top walls, `y` along the left/right. Walls are `"S"` (bottom),
`"N"` (top), `"W"` (left), `"E"` (right).

```python
ROOM = Room(
    width=ft(11), height=ft(11),                     # 11' x 11'
    door=Door(wall="S", offset=94, width=32, hinge="right"),
    openings=[
        # a closet: keep 30" clear in front, furniture may NOT block it
        Opening(wall="E", offset=48, width=29, clearance=30, kind="closet"),
        # a window: furniture may sit under it, but no crib/bassinet within 30"
        Opening(wall="W", offset=34, width=64, kind="window",
                blockable=True, no_sleep_within=30),
    ],
)
```

`Opening` flags let you describe intent as **data** (no code changes):
- `clearance` — inches of floor to keep clear in front.
- `blockable=True` — furniture may sit in front of it (e.g. a low dresser under a window).
- `no_sleep_within=N` — a crib/bassinet within `N` inches is rejected (safety).

## Describing furniture

Each piece is a footprint (`w` along the wall, `d` into the room) plus
**clearance `Zone`s** — the space that must stay open on a given side for the
piece to be usable. Usability is graded generically from these zones, so **new
furniture needs zero changes to the scorer.**

```python
Furniture(
    name="Dresser / changer", w=56, d=19,
    zones=(Zone("front", 30, 36, "drawers + changing", weight=1.6),),
    #            side   min ideal  label                importance
)
```

- `side` — `"front"` (faces into room), `"back"`, `"left"`, `"right"`.
- `min` / `ideal` — inches that must be clear / a roomier target (comfort credit).
- `weight` — how much a shortfall hurts the score.
- `symmetric=False` — also try the mirror image (e.g. a bed's get-in side).
- `sleep=True` — marks a baby sleep surface, for the `no_sleep_within` rule.

## How the score works

**Feasibility (hard — infeasible layouts are dropped):** every piece inside the
room, no overlaps, nothing in the door swing, nothing blocking a non-blockable
opening, no sleep surface inside an opening's `no_sleep_within`.

**Score = 100 − penalties:**
- **Clearance** — each zone is penalized by how much of its `min` depth is
  blocked (by another piece, the door swing, or a wall).
- **Circulation** — the open floor is eroded by half a person's width (→ a 30"
  path); any floor or piece-front you can't reach from the door without
  squeezing is penalized. This catches "the bed is too close to the crib to
  walk between them."
- **Comfort** (how much of the roomier `ideal` clearance is open) breaks ties
  between equally-clean layouts; it never masks a real issue.

Clearance defaults come from interior-design spacing guides (main walkway 36",
dresser front 30–36", crib reach-in 30", door approach 18", etc.).

## Grading a specific idea

`solve()` is a **heuristic beam search** — it returns strong candidates, not a
proof of the global best, and can miss a specific layout you have in mind. To
judge any exact arrangement, use `evaluate.py` / `resolve_spec`, which is ground
truth:

```python
from roomsolver import resolve_spec, grade
LAYOUT = {"Crib": ("E", 80), "Glider": ("W", 32, True)}  # name: (wall, offset[, flip])
pieces = resolve_spec(ROOM, FURNITURE, LAYOUT)
print(grade(ROOM, pieces)["score"], grade(ROOM, pieces)["violations"])
```

## Good to know

- **Different rooms / walls work**, but `render_room()`'s "ENTRY" label and door
  leaf are drawn assuming a **south-wall entry** (the solver and scorer are
  wall-agnostic; only that one sign-off drawing assumes it).
- Tuning knobs: clearance constants in `roomsolver/rules.py`; circulation
  strictness (`WALK_COMFORT`, penalty weights) at the top of
  `roomsolver/scoring.py`; search breadth (`beam`, `step`, `top`) as args to
  `solve()`.
- Possible next step, intentionally not done: `solve()` re-grades each partial
  layout from scratch — the main thing to optimize if the furniture count grows.

## License

MIT — see [LICENSE](LICENSE).
