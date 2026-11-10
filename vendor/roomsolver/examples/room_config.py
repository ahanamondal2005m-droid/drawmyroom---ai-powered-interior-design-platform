"""The actual nursery room. Edit here; solver/render import from this.

Orientation: you ENTER from the South wall. Walking in (north), your right hand
is the East wall, which holds the closet. The window is on the opposite (West)
wall. Origin (0,0) is the SW corner; +x east, +y north. Inches throughout.
"""
from roomsolver import Room
from roomsolver.model import Door, Opening, Furniture, Zone
from roomsolver import rules

W = H = rules.ft(11)          # 132 x 132 in

# Recessed closet on the East wall: 4'10" of sliding doors, near edge 4' from
# the entry (South) wall. Modeled as two halves: the half nearer the door must
# stay accessible; the far half is long-term storage and may be blocked.
_C0 = rules.ft(4)                 # closet near edge, 48" from door wall
_CW = rules.ft(4, 10) / 2         # 29" per half

ROOM = Room(
    width=W, height=H,
    # entry door in the SE corner, 6" gap from the East (closet) wall,
    # 32" leaf hinged on the corner side, swinging into the room
    door=Door(wall="S", offset=W - 6 - 32, width=32, hinge="right"),
    openings=[
        # accessible half (nearer the door) — keep 30" clear, cannot be blocked
        Opening(wall="E", offset=_C0, width=_CW, clearance=30, kind="closet",
                blockable=False, label="closet (accessible)"),
        # storage half (far) — long-term storage, may be fully blocked
        Opening(wall="E", offset=_C0 + _CW, width=_CW, clearance=0, kind="closet",
                blockable=True, label="closet (storage)"),
        # window centered on the West wall: furniture (incl. bed) may sit under
        # it freely, but no baby SLEEP surface within 30" (crib/bassinet safety)
        Opening(wall="W", offset=rules.ft(2, 10), width=rules.ft(5, 4),
                clearance=0, kind="window", blockable=True, label="window",
                no_sleep_within=30),
    ],
)

# ---- the actual furniture ---------------------------------------------------
PIECES = [
    # bed stays; get-in clearance on one long side matters most
    Furniture(name="Twin bed", w=38, d=75, color="#cfd8dc", symmetric=False,
              zones=(Zone("left", 30, 36, "get-in side", 1.0),
                     Zone("front", 20, 26, "foot clearance", 0.3))),
    Furniture(name="Crib", w=52, d=28, color="#f4c7c3", symmetric=False,
              sleep=True,
              zones=(Zone("front", 30, 36, "reach-in / lift baby", 1.4),
                     Zone("left", 24, 30, "side access", 0.5))),
    # dresser doubles as the changing station -> front clearance is critical
    Furniture(name="Dresser / changer", w=56, d=19, color="#bfe3c0",
              symmetric=True,
              zones=(Zone("front", 30, 36, "drawers + changing", 1.6),)),
    # swivel + recliner. Footprint is the UPRIGHT body (34"w x ~36"d). The
    # recline sweep + foot room (out to ~71" from the wall = reclined 63" + 8")
    # is a front CLEARANCE that must stay clear to use, but doubles as walkway
    # when the chair is upright. +8" each side to swivel and get in/out.
    Furniture(name="Glider", w=34, d=36, color="#c9c2ec", symmetric=True,
              zones=(Zone("front", 35, 40, "recline + feet", 1.2),
                     Zone("left", 8, 12, "swivel / get in", 0.6),
                     Zone("right", 8, 12, "swivel / get in", 0.6))),
    # bassinet is temporary and may sit awkwardly -> low-weight, small clearance
    Furniture(name="Bassinet", w=35, d=19, color="#f9e0a2", symmetric=True,
              sleep=True,
              zones=(Zone("front", 16, 24, "bedside access (temp)", 0.2),)),
    # 12" round diaper pail -> tiny footprint, just needs to be reachable
    Furniture(name="Diaper pail", w=12, d=12, color="#d0d0d0", symmetric=True,
              zones=(Zone("front", 6, 10, "lid / foot pedal", 0.15),)),
]
