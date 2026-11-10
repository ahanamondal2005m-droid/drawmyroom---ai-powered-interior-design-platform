"""Search wall placements and rank layouts by usability.

Beam search: place the largest pieces first (best pruning), keep the top-N
partial layouts at each step, expand. Returns the best complete layouts.
"""
from .model import Placement, Layout, WALLS
from .scoring import grade


def _candidates(room, furn, step):
    """All (wall, offset, flip) placements where the piece physically fits."""
    out = []
    flips = (False, True) if furn.can_flip else (False,)
    for wall in WALLS:
        along = room.wall_length(wall)          # room span the width runs along
        into = room.height if wall in ("N", "S") else room.width  # depth axis
        if furn.w > along or furn.d > into:
            continue
        max_off = along - furn.w
        n = max(1, int(max_off // step) + 1)
        offsets = [min(max_off, i * step) for i in range(n)]
        if max_off not in offsets:
            offsets.append(max_off)             # always try the flush-corner spot
        for off in offsets:
            for flip in flips:
                out.append(Placement(wall, round(off, 2), flip))
    return out


def _key(pieces):
    return tuple(sorted(
        (p.furniture.name, p.placement.wall, round(p.placement.offset),
         p.placement.flip) for p in pieces))


def _family(pieces, bucket=24, min_area=800):
    """Coarse signature over the MAJOR pieces only (small/flexible pieces like a
    bassinet or diaper pail don't define a distinct arrangement)."""
    major = [p for p in pieces if p.furniture.w * p.furniture.d >= min_area]
    return tuple(sorted(
        (p.furniture.name, p.placement.wall, round(p.placement.offset / bucket))
        for p in major))


def _anchor_key(trial, bucket):
    """Family of just the largest (anchor) piece placed so far. Capping the beam
    on this guarantees every distinct anchor placement survives to completion,
    instead of being judged on a half-built partial score."""
    p = max(trial, key=lambda p: p.furniture.w * p.furniture.d)
    return (p.furniture.name, p.placement.wall,
            round(p.placement.offset / bucket), p.placement.flip)


def _prune_diverse(nxt, beam, cap, bucket, keyfn):
    """Keep the top `beam` partial states, but at most `cap` from any one family
    (per `keyfn`), so a single arrangement can't crowd out distinct alternatives.
    Leftover slots (if few families) are back-filled by raw score."""
    nxt.sort(key=lambda s: s[0], reverse=True)
    picked, counts, taken = [], {}, [False] * len(nxt)
    for i, (_, trial) in enumerate(nxt):
        fam = keyfn(trial, bucket)
        if counts.get(fam, 0) >= cap:
            continue
        counts[fam] = counts.get(fam, 0) + 1
        picked.append(nxt[i]); taken[i] = True
        if len(picked) >= beam:
            return picked
    for i in range(len(nxt)):          # back-fill if the cap left us short
        if not taken[i]:
            picked.append(nxt[i])
            if len(picked) >= beam:
                break
    return picked


def solve(room, furns, *, beam=400, step=6.0, top=5, diverse=True, bucket=24,
          anchor_cap=14):
    """Return the top-`top` layouts, each as dict(layout, grade), best first.

    With `diverse=True` the results are de-duplicated to distinct arrangement
    "families" (each piece on the same wall within a ~`bucket`-inch zone counts
    as the same family), so you see real alternatives, not micro-variants. During
    the search the beam is capped at `anchor_cap` states per placement of the
    largest piece, so every distinct anchor spot is carried to completion (a
    corner-bed layout isn't dropped just because its half-built score looked bad).
    """
    order = sorted(furns, key=lambda f: f.w * f.d, reverse=True)

    states = [(0.0, [])]                        # (partial score, placed pieces)
    for furn in order:
        cands = _candidates(room, furn, step)
        nxt = []
        seen = set()
        for _, placed in states:
            for pl in cands:
                pp = room.resolve(furn, pl)
                trial = placed + [pp]
                g = grade(room, trial, partial=True)
                if not g["feasible"]:
                    continue
                k = _key(trial)
                if k in seen:
                    continue
                seen.add(k)
                nxt.append((g["score"], trial))
        if not nxt:
            raise RuntimeError(
                f"No feasible spot for {furn.name} given the pieces already placed. "
                "Room may be too small or too full.")
        states = _prune_diverse(nxt, beam, anchor_cap, bucket, _anchor_key)

    ranked = []
    seen = set()
    for _, placed in states:
        k = _key(placed)
        if k in seen:
            continue
        seen.add(k)
        g = grade(room, placed, partial=False)
        ranked.append(dict(layout=Layout(room, placed), grade=g))
    # best score first; break ties by comfort (roomier clearances win)
    ranked.sort(key=lambda r: (r["grade"]["score"], r["grade"]["comfort"]),
                reverse=True)
    if not diverse:
        return ranked[:top]

    out, seen_fam = [], set()
    for r in ranked:
        fam = _family(r["layout"].pieces, bucket)
        if fam in seen_fam:
            continue
        seen_fam.add(fam)
        out.append(r)
        if len(out) >= top:
            break
    return out
