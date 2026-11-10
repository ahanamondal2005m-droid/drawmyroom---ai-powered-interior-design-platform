"""Solve the real nursery and render the best layouts.  Run: python3 demo.py"""
import time
from room_config import ROOM, PIECES
from roomsolver import solve
from roomsolver.render import render_layout, render_grid

t0 = time.time()
results = solve(ROOM, PIECES, beam=250, step=8.0, top=5, diverse=True)
dt = time.time() - t0

print(f"\n11 x 11 ft nursery · {len(PIECES)} pieces · solved in {dt:.1f}s\n")
for i, r in enumerate(results, 1):
    g = r["grade"]
    print(f"#{i}  score {g['score']:>5.1f}/100   (penalty {g['penalty']})")
    for p in r["layout"].pieces:
        pl = p.placement
        print(f"      {p.name:<20} wall {pl.wall} @ {pl.offset:>3.0f}\""
              f"{'  (flipped)' if pl.flip else ''}")
    for v in g["violations"] or ["clean — all clearances met"]:
        print(f"        • {v}")
    print()

render_grid(results, "top_layouts.png", cols=3)
render_layout(results[0]["layout"], results[0]["grade"], "best_layout.png",
              show_reach=True)
print("Wrote top_layouts.png and best_layout.png (best shows reachability)")
