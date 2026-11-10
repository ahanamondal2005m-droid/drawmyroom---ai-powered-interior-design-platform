"""Geometry model: Room, Furniture (+ clearance Zones), Placement, Layout.

Coordinate frame: origin at the room's bottom-left corner, +x right, +y up.
A piece is defined in a LOCAL frame with its back edge on y=0 and its front
face at y=depth. When placed against a wall, the back edge sits on the wall and
the front (drawers / access side) faces into the room.
"""
import math
from dataclasses import dataclass, field
from typing import Optional

from shapely.geometry import box, Polygon
from shapely.affinity import rotate, translate

WALLS = ("S", "N", "W", "E")  # bottom, top, left, right


@dataclass(frozen=True)
class Zone:
    """A directional clearance requirement attached to one side of a piece."""
    side: str          # 'front' | 'back' | 'left' | 'right'
    min_depth: float   # inches that MUST be clear for the piece to be usable
    ideal_depth: float # inches for a comfortable layout (earns comfort credit)
    label: str         # e.g. "drawer pull-out"
    weight: float = 1.0

    def flipped(self) -> "Zone":
        swap = {"left": "right", "right": "left"}
        return Zone(swap.get(self.side, self.side),
                    self.min_depth, self.ideal_depth, self.label, self.weight)


@dataclass(frozen=True)
class Furniture:
    name: str
    w: float                 # width along the wall (back/front edge)
    d: float                 # depth, wall to front face
    zones: tuple = ()        # tuple[Zone]
    color: str = "#b9c6d6"
    symmetric: bool = True   # True -> no point trying the flipped placement
    sleep: bool = False      # a baby sleep surface (crib/bassinet) -> not under a window

    @property
    def can_flip(self) -> bool:
        return not self.symmetric


@dataclass(frozen=True)
class Placement:
    wall: str          # 'N' | 'S' | 'E' | 'W'
    offset: float      # distance along the wall from the origin corner
    flip: bool = False


# ---- local -> world transform ----------------------------------------------
def _place(geom, wall, offset, W, H, w, d):
    """Map a local-frame geometry to world coords for a wall placement.

    Local frame: footprint x in [0,w], y in [0,d]; front face is the y=d edge.
    In every wall case the front face ends up pointing into the room.
    """
    if wall == "S":       # bottom wall, front faces +y
        return translate(rotate(geom, 0, origin=(0, 0)), offset, 0)
    if wall == "N":       # top wall, front faces -y
        return translate(rotate(geom, 180, origin=(0, 0)), offset + w, H)
    if wall == "W":       # left wall, front faces +x
        return translate(rotate(geom, -90, origin=(0, 0)), 0, offset + w)
    if wall == "E":       # right wall, front faces -x
        return translate(rotate(geom, 90, origin=(0, 0)), W, offset)
    raise ValueError(f"bad wall {wall!r}")


def _local_zone_rect(side, w, d, depth):
    """Rectangle extending `depth` outward from one local edge of the footprint."""
    if side == "front":
        return box(0, d, w, d + depth)
    if side == "back":
        return box(0, -depth, w, 0)
    if side == "left":
        return box(-depth, 0, 0, d)
    if side == "right":
        return box(w, 0, w + depth, d)
    raise ValueError(side)


@dataclass
class PlacedPiece:
    """A Furniture pinned to a Placement inside a Room — resolved to world geometry."""
    furniture: Furniture
    placement: Placement
    footprint: Polygon
    zones: list  # list[dict(side,label,weight,min_depth,ideal_depth,min_poly,ideal_poly)]

    @property
    def name(self):
        return self.furniture.name


@dataclass
class Door:
    wall: str
    offset: float          # position of the hinge-side jamb along the wall
    width: float = 32.0
    hinge: str = "left"    # which end of the opening the hinge is on ('left'/'right' along wall dir)

    def swing_polygon(self, W, H) -> Polygon:
        """Quarter-circle the door leaf sweeps, as a polygon in world coords."""
        # Build in local frame: opening along x in [0,width] on y=0, swinging up.
        hinge_x = 0.0 if self.hinge == "left" else self.width
        pts = [(hinge_x, 0.0)]
        steps = 16
        for i in range(steps + 1):
            a = math.pi / 2 * i / steps
            # sweep from the wall line up into the room
            dx = self.width * math.cos(a)
            dy = self.width * math.sin(a)
            if self.hinge == "left":
                pts.append((hinge_x + dx, dy))
            else:
                pts.append((hinge_x - dx, dy))
        leaf = Polygon(pts)
        return _place(leaf, self.wall, self.offset, W, H, self.width, self.width)

    def approach_polygon(self, W, H, depth) -> Polygon:
        """Clear-approach box in front of the opening (both sides of the door)."""
        rect = box(0, 0, self.width, depth)
        return _place(rect, self.wall, self.offset, W, H, self.width, depth)


@dataclass
class Opening:
    """A closet or window on a wall that needs front clearance.

    `depth` (optional) is how far the cavity extends *behind* the wall — used
    only to draw the recess; it does not consume room floor.
    """
    wall: str
    offset: float
    width: float
    clearance: float      # inches of clear floor needed in front of it
    kind: str = "closet"  # 'closet' | 'window'
    depth: float = 0.0
    blockable: bool = False   # True -> furniture may sit against/in front of it
    label: str = ""           # optional drawing label
    no_sleep_within: float = 0.0  # >0 -> no baby sleep surface within this many
                                  #       inches (e.g. a window, for safety)

    def mouth(self, W, H) -> Polygon:
        rect = box(0, -1, self.width, 0)  # a thin sliver on the wall line
        return _place(rect, self.wall, self.offset, W, H, self.width, 1)

    def front_zone(self, W, H, depth) -> Polygon:
        """Rectangle of the given depth in front of the opening, into the room."""
        return _place(box(0, 0, self.width, depth), self.wall, self.offset,
                      W, H, self.width, depth)

    def clearance_polygon(self, W, H) -> Polygon:
        return self.front_zone(W, H, self.clearance)

    def recess_polygon(self, W, H) -> Polygon:
        """The cavity behind the wall, for drawing (outside the room)."""
        d = self.depth
        o, w = self.offset, self.width
        if self.wall == "S":
            return box(o, -d, o + w, 0)
        if self.wall == "N":
            return box(o, H, o + w, H + d)
        if self.wall == "W":
            return box(-d, o, 0, o + w)
        if self.wall == "E":
            return box(W, o, W + d, o + w)
        raise ValueError(self.wall)


@dataclass
class Room:
    width: float          # x extent (inches)
    height: float         # y extent (inches)
    door: Optional[Door] = None
    openings: list = field(default_factory=list)   # list[Opening] (windows, etc.)
    fixtures: list = field(default_factory=list)   # list[PlacedPiece] built-ins

    @property
    def polygon(self) -> Polygon:
        return box(0, 0, self.width, self.height)

    def wall_length(self, wall) -> float:
        return self.width if wall in ("N", "S") else self.height

    # -- resolve a furniture + placement into world geometry -------------------
    def resolve(self, furn: Furniture, pl: Placement) -> PlacedPiece:
        W, H, w, d = self.width, self.height, furn.w, furn.d
        fp = _place(box(0, 0, w, d), pl.wall, pl.offset, W, H, w, d)
        zones = []
        for z in furn.zones:
            zz = z.flipped() if pl.flip else z
            minp = _place(_local_zone_rect(zz.side, w, d, zz.min_depth),
                          pl.wall, pl.offset, W, H, w, d)
            idealp = _place(_local_zone_rect(zz.side, w, d, zz.ideal_depth),
                            pl.wall, pl.offset, W, H, w, d)
            zones.append(dict(side=zz.side, label=zz.label, weight=zz.weight,
                              min_depth=zz.min_depth, ideal_depth=zz.ideal_depth,
                              min_poly=minp, ideal_poly=idealp))
        return PlacedPiece(furn, pl, fp, zones)


@dataclass
class Layout:
    room: Room
    pieces: list  # list[PlacedPiece]

    def footprints(self):
        return [p.footprint for p in self.pieces]


def resolve_spec(room, furniture, spec):
    """Resolve a hand-written layout into placed pieces.

    `furniture` is a list of Furniture (or a name->Furniture dict); `spec` maps a
    piece name to its placement args, e.g. {"Crib": ("E", 80), "Glider": ("W", 32, True)}.
    """
    by = furniture if isinstance(furniture, dict) else {f.name: f for f in furniture}
    out = []
    for name, args in spec.items():
        if name not in by:
            raise KeyError(
                f"{name!r} is not in the furniture list. Available: {sorted(by)}")
        out.append(room.resolve(by[name], Placement(*args)))
    return out
