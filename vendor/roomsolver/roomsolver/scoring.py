"""Grade a layout for usability.

A layout is FEASIBLE only if nothing physically conflicts (pieces inside the
room, no overlaps, nothing blocking the door swing or a closet mouth). Among
feasible layouts, the score rewards keeping every clearance zone open and
penalizes the ones that are pinched.
"""
from shapely.ops import unary_union
from shapely.geometry import Polygon

from . import rules

TOL = 4.0          # in^2, ignore hairline geometric overlaps
PENALTY_PER_ZONE = 22.0   # cost of a fully-blocked, unit-weight min clearance
COMFORT_CAP = 8.0

# ---- circulation (walkways) -------------------------------------------------
WALK_COMFORT = 30.0        # a comfortable path / gap to walk through (inches)
WALK_R = WALK_COMFORT / 2  # person modeled as a disk of this radius
CIRC_FLOOR_W = 50.0        # penalty scale for floor cut off by a pinch
CIRC_ACCESS_W = 40.0       # penalty scale for a piece you must squeeze to reach
CIRC_CAP = 70.0            # max total circulation penalty
MIN_WALK_AREA = 200.0      # in^2, ignore tiny eroded nubs as "walkable"


def _area(g):
    return g.area if g and not g.is_empty else 0.0


def _closest_pinch(pieces, fps):
    """Tightest walk-sized gap between two pieces (10-30"), for a readable note.
    Gaps under 10" are just furniture sitting side by side, not attempted paths."""
    best = None
    for i in range(len(fps)):
        for j in range(i + 1, len(fps)):
            g = fps[i].distance(fps[j])
            if 10.0 <= g < WALK_COMFORT and (best is None or g < best[0]):
                best = (g, pieces[i].name, pieces[j].name)
    return best


def walkable_regions(room, fps, door_swing=None):
    """Return (free_floor, reachable) polygons.

    `reachable` is the floor you can actually stand on having walked in from the
    doorway using only >=30"-wide paths. It is found by eroding the open floor by
    half a person's width (so sub-30" corridors vanish), keeping only the region
    connected to the doorway, then dilating back. Floor outside `reachable` is
    stranded behind a pinch — you'd have to squeeze to get there.

    Pass `door_swing` to reuse an already-computed swing polygon; otherwise it is
    derived from the room's door.
    """
    room_poly = room.polygon
    if door_swing is None and room.door is not None:
        door_swing = room.door.swing_polygon(room.width, room.height)
    blocked = list(fps) + ([door_swing] if door_swing is not None else [])
    free = room_poly.difference(unary_union(blocked)) if blocked else room_poly
    if free.is_empty:
        return free, free

    core = free.buffer(-WALK_R)
    comps = [c for c in (core.geoms if hasattr(core, "geoms") else [core])
             if c.area >= MIN_WALK_AREA]
    if not comps:
        return free, Polygon()  # empty

    if room.door is not None:
        # a person standing just inside the doorway
        entry = room.door.approach_polygon(
            room.width, room.height, WALK_COMFORT + 12).intersection(free)
        seed = [c for c in comps if c.buffer(2).intersects(entry)]
        reach_core = unary_union(seed) if seed else None
    else:
        reach_core = max(comps, key=lambda c: c.area)

    if reach_core is None or reach_core.is_empty:
        return free, Polygon()  # can't even get in
    reachable = reach_core.buffer(WALK_R).intersection(free)
    return free, reachable


def _circulation(room, pieces, fps, door_swing):
    """Penalize (a) floor stranded behind a sub-30" pinch and (b) any piece
    whose front you can't reach from the door without squeezing."""
    free, reachable = walkable_regions(room, fps, door_swing)
    if free.is_empty:
        return CIRC_CAP, ["The room is completely filled — nowhere to walk"]
    if reachable.is_empty:
        return CIRC_CAP, ["You can't get into the room without squeezing"]

    notes = []

    # (a) stranded walkable floor
    stranded = free.difference(reachable)
    stranded_walk = _area(stranded.buffer(-WALK_R))   # only count spots you'd stand
    frac = min(1.0, stranded_walk / max(1.0, _area(free.buffer(-WALK_R))))
    penalty = CIRC_FLOOR_W * frac
    if frac > 0.02:
        pinch = _closest_pinch(pieces, fps)
        if pinch:
            notes.append(f"only {pinch[0]:.0f}\" between {pinch[1]} and "
                         f"{pinch[2]} — tight to walk through")
        notes.append("part of the room sits behind a sub-30\" pinch")

    # (b) a piece's front access stranded — you'd squeeze to use it
    for p in pieces:
        for z in p.zones:
            if z["side"] != "front":
                continue
            minp = z["min_poly"].intersection(room.polygon)
            if minp.is_empty:
                continue
            short = 1 - _area(minp.intersection(reachable)) / _area(minp)
            if short > 0.15:
                penalty += z["weight"] * CIRC_ACCESS_W * short
                notes.append(f"{p.name}: must squeeze past furniture to reach "
                             f"the {z['label']}")

    return min(CIRC_CAP, penalty), notes


def grade(room, pieces, *, partial=False):
    """Grade a list of PlacedPiece against a Room.

    Returns dict: feasible, score (0-100), penalty, comfort, violations[str],
    per_piece[dict]. `partial=True` skips the "everything is placed" comforts so
    the solver can score work-in-progress beam states.
    """
    # built-in fixtures (e.g. a protruding closet) act as fixed obstacles AND
    # get their own clearances graded, so merge them into the piece list.
    pieces = list(room.fixtures) + list(pieces)
    fps = [p.footprint for p in pieces]
    room_poly = room.polygon
    violations = []
    per_piece = []

    # ---- HARD feasibility ---------------------------------------------------
    # 1. each footprint inside the room
    for p in pieces:
        if _area(p.footprint.difference(room_poly)) > TOL:
            return _infeasible(f"{p.name} sticks out past a wall")
    # 2. no footprint-on-footprint overlap
    for i in range(len(fps)):
        for j in range(i + 1, len(fps)):
            if _area(fps[i].intersection(fps[j])) > TOL:
                return _infeasible(
                    f"{pieces[i].name} overlaps {pieces[j].name}")
    # 3. nothing blocking the door swing
    door_swing = room.door.swing_polygon(room.width, room.height) if room.door else None
    if door_swing is not None:
        for p in pieces:
            if _area(p.footprint.intersection(door_swing)) > TOL:
                return _infeasible(f"{p.name} blocks the door swing")
    # 4. nothing covering a closet/window mouth (unless it's blockable)
    for op in room.openings:
        if op.blockable:
            continue
        mouth = op.mouth(room.width, room.height)
        for p in pieces:
            if _area(p.footprint.intersection(mouth.buffer(2))) > TOL:
                return _infeasible(f"{p.name} blocks the {op.label or op.kind}")

    # 5. no baby sleep surface (crib/bassinet) too close to a flagged opening
    #    (e.g. a window) — declared per-opening via `no_sleep_within`.
    for op in room.openings:
        if op.no_sleep_within <= 0:
            continue
        zone = op.front_zone(room.width, room.height, op.no_sleep_within)
        for p in pieces:
            if p.furniture.sleep and _area(p.footprint.intersection(zone)) > TOL:
                return _infeasible(
                    f"{p.name} is under the {op.label or op.kind} (baby safety)")

    # ---- SOFT usability grading --------------------------------------------
    penalty = 0.0
    comfort = 0.0

    # Everything a clearance zone can be blocked by: the other footprints and the
    # door swing. A piece's own footprint is included but only touches its own
    # (outward) zones at an edge, so it doesn't affect the result — letting us
    # build this union ONCE instead of per piece.
    obstacles = list(fps) + ([door_swing] if door_swing is not None else [])
    obstacle_union = unary_union(obstacles) if obstacles else None
    all_fp = unary_union(fps) if fps else None

    def blocked_frac(poly):
        """Fraction of `poly` that falls outside the room or onto an obstacle."""
        area = _area(poly)
        if area <= 0:
            return 0.0
        blk = poly.difference(room_poly)  # outside the room
        if obstacle_union is not None:
            blk = unary_union([blk, poly.intersection(obstacle_union)])
        return min(1.0, _area(blk) / area)

    for p in pieces:
        piece_notes = []
        for z in p.zones:
            if _area(z["min_poly"]) <= 0:
                continue
            frac = blocked_frac(z["min_poly"])
            penalty += z["weight"] * frac * PENALTY_PER_ZONE

            # approximate clear depth for a human-readable message
            if frac > 0.05:
                clear_depth = z["min_depth"] * (1 - frac)
                msg = (f"{p.name}: {z['label']} only ~{clear_depth:.0f}\" clear, "
                       f"need {z['min_depth']:.0f}\"")
                violations.append(msg)
                piece_notes.append(msg)

            # comfort credit: how much of the *ideal* zone is open
            if _area(z["ideal_poly"]) > 0:
                comfort += z["weight"] * (1 - blocked_frac(z["ideal_poly"]))
        per_piece.append(dict(name=p.name, notes=piece_notes))

    def _clearance_penalty(zone_poly, message):
        """Penalize a fixed clearance zone (door approach, closet) by how much of
        it the furniture footprints cover."""
        nonlocal penalty
        zone_poly = zone_poly.intersection(room_poly)
        if all_fp is None or _area(zone_poly) <= 0:
            return
        frac = min(1.0, _area(zone_poly.intersection(all_fp)) / _area(zone_poly))
        if frac > 0.05:
            penalty += frac * PENALTY_PER_ZONE
            violations.append(message.format(pct=frac * 100))

    if room.door is not None:
        _clearance_penalty(
            room.door.approach_polygon(room.width, room.height, rules.DOOR_APPROACH),
            "Doorway approach {pct:.0f}% obstructed")
    for op in room.openings:
        _clearance_penalty(
            op.clearance_polygon(room.width, room.height),
            f"{op.kind.title()} clearance {{pct:.0f}}% blocked")

    # Score is purely the clearance penalty: a clean layout is 100, every
    # violation pulls it down. Comfort is reported separately and used only as
    # a tie-breaker among equally-clean layouts (see solver) — it never masks a
    # violation by pushing the score back up to 100.
    # circulation: only on complete layouts (a partial layout has open gaps that
    # aren't real walkways yet). This is what makes a bed-too-close-to-crib pinch
    # score low even when every piece's own clearance is fine.
    if not partial:
        circ_pen, circ_notes = _circulation(room, pieces, fps, door_swing)
        penalty += circ_pen
        violations.extend(circ_notes)

    comfort_bonus = min(COMFORT_CAP, comfort)
    score = max(0.0, 100.0 - penalty)
    return dict(feasible=True, score=round(score, 1),
                penalty=round(penalty, 1), comfort=round(comfort_bonus, 1),
                violations=violations, per_piece=per_piece)


def _infeasible(reason):
    return dict(feasible=False, score=0.0, penalty=999.0, comfort=0.0,
                violations=[reason], per_piece=[])
