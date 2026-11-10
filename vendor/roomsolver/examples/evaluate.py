"""Grade ONE specific arrangement you have in mind — exact score, the reasons,
and a reachability map. This is ground truth; the solver's ranked list is only a
heuristic's best finds, so use this to check any idea it didn't surface.

Edit LAYOUT (piece -> wall, inches-from-corner, flip) and run:  python3 evaluate.py
Walls: N=far, S=entry, E=closet, W=window.  offset runs from the SW corner
(x for N/S, y for E/W).  flip swaps a piece's left/right access side.
"""
from room_config import ROOM, PIECES
from roomsolver import grade, resolve_spec
from roomsolver.model import Layout
from roomsolver.render import render_layout

# The bed<->glider swap: bed in the NW corner, glider beside it.
LAYOUT = {
    "Twin bed":          ("N", 0,  False),
    "Glider":            ("N", 40, False),
    "Crib":              ("E", 80, False),
    "Dresser / changer": ("S", 0,  False),
    "Bassinet":          ("S", 56, False),
    "Diaper pail":       ("E", 32, False),
}

pieces = resolve_spec(ROOM, PIECES, LAYOUT)
g = grade(ROOM, pieces)
print(f"Score {g['score']}/100  (penalty {g['penalty']}, feasible={g['feasible']})")
for v in g["violations"] or ["clean — all clearances met"]:
    print(f"   • {v}")
render_layout(Layout(ROOM, pieces), g, "my_layout.png", show_reach=True)
print("Wrote my_layout.png (green = reachable from door, red = stranded)")
