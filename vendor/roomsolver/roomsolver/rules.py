"""Clearance rulebook + default furniture library.

Numbers are design-standard clearances (inches), sourced from interior-design
spacing guides. Each furniture piece carries its own clearance ZONES so the
scorer can grade usability objectively.

Sources:
  - RoomSketch clearance guide
  - Homes & Gardens bedroom clearances
  - Rocabu dresser / wardrobe spacing
"""

# ---- generic circulation clearances (inches) --------------------------------
WALKWAY_MAIN_MIN = 36        # primary path through the room
WALKWAY_MAIN_IDEAL = 42
WALKWAY_SECONDARY_MIN = 30   # squeeze path between two pieces
DOOR_APPROACH = 18           # clear approach on the latch side of a door

# Feet<->inches helper (rooms are usually spec'd in feet).
def ft(feet, inches=0.0):
    return feet * 12.0 + inches


# ---- default furniture library ----------------------------------------------
# Dimensions are typical; override per your actual pieces. `w` runs along the
# wall, `d` is depth from wall to front face. Zones encode usability.
def library():
    from .model import Furniture, Zone

    return {
        "crib": Furniture(
            name="Crib", w=52, d=28, color="#f4c7c3", symmetric=False,
            zones=(
                Zone("front", 30, 36, "reach-in / lift baby", weight=1.4),
                Zone("left", 24, 30, "side access", weight=0.5),
            ),
        ),
        "bassinet": Furniture(
            name="Bassinet", w=33, d=19, color="#f9e0a2", symmetric=True,
            zones=(Zone("front", 24, 30, "bedside access", weight=1.0),),
        ),
        "dresser": Furniture(
            name="Dresser / changer", w=36, d=20, color="#bfe3c0", symmetric=True,
            zones=(Zone("front", 30, 36, "drawer pull-out + changing", weight=1.5),),
        ),
        "glider": Furniture(
            name="Glider", w=30, d=34, color="#c9c2ec", symmetric=True,
            zones=(Zone("front", 20, 28, "footrest / rocking swing", weight=1.0),),
        ),
        "twin_bed": Furniture(
            name="Twin bed", w=38, d=75, color="#cfd8dc", symmetric=False,
            zones=(
                Zone("left", 30, 36, "get-in side", weight=1.0),
                Zone("front", 24, 30, "foot clearance", weight=0.4),
            ),
        ),
    }
