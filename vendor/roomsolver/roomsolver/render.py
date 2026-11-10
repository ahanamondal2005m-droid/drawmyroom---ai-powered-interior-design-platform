"""Top-down matplotlib drawings of a layout.

Draws walls, the door swing arc, closet/window openings, each piece with its
clearance zones hatched, and annotates the usability score + violations.
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon as MplPoly


def _poly(ax, geom, **kw):
    """Draw the polygon(s) in `geom`. Shapely set-ops can return Multi*/collections
    or even stray lines (edge-touching intersections); recurse and draw only real
    polygons so those never crash the renderer."""
    if geom is None or geom.is_empty:
        return
    if hasattr(geom, "geoms"):                 # Multi* or GeometryCollection
        for g in geom.geoms:
            _poly(ax, g, **kw)
        return
    if not hasattr(geom, "exterior"):          # LineString / Point — nothing to fill
        return
    ax.add_patch(MplPoly(list(geom.exterior.coords), closed=True, **kw))


def _draw_walls(ax, W, H):
    ax.add_patch(MplPoly([(0, 0), (W, 0), (W, H), (0, H)], closed=True,
                         fill=False, edgecolor="#333", linewidth=3))


def _shade_reach(ax, layout):
    """Green = floor reachable from the door via >=30" paths; red = stranded."""
    from .scoring import walkable_regions
    free, reach = walkable_regions(
        layout.room, [p.footprint for p in layout.pieces])
    _poly(ax, free.difference(reach), facecolor="#e57373", edgecolor="none",
          alpha=0.5, zorder=0)
    _poly(ax, reach, facecolor="#81c784", edgecolor="none", alpha=0.4, zorder=0)


def _draw(ax, layout, grade, show_reach=False):
    room = layout.room
    W, H = room.width, room.height
    if show_reach:
        _shade_reach(ax, layout)

    _draw_walls(ax, W, H)

    # openings (closet / window)
    for op in room.openings:
        _poly(ax, op.clearance_polygon(W, H), facecolor="#eeeeee",
              edgecolor="none", alpha=0.5, zorder=1)
        _poly(ax, op.mouth(W, H).buffer(1.5), facecolor="#8d6e63",
              edgecolor="none", zorder=3)

    # door swing
    if room.door is not None:
        _poly(ax, room.door.swing_polygon(W, H), facecolor="none",
              edgecolor="#8d6e63", linewidth=1.2, linestyle="--", zorder=2)

    # built-in fixtures (protruding closet, etc.)
    _draw_fixtures(ax, room)

    # clearance zones (draw first so footprints sit on top)
    for p in layout.pieces:
        for z in p.zones:
            _poly(ax, z["ideal_poly"], facecolor=p.furniture.color,
                  edgecolor="none", alpha=0.12, zorder=2)
            _poly(ax, z["min_poly"], facecolor="none", edgecolor=p.furniture.color,
                  linewidth=1.0, linestyle=":", hatch="///", alpha=0.6, zorder=2)

    # footprints + labels
    for p in layout.pieces:
        _poly(ax, p.footprint, facecolor=p.furniture.color, edgecolor="#37474f",
              linewidth=1.5, zorder=4)
        c = p.footprint.centroid
        ax.text(c.x, c.y, p.furniture.name, ha="center", va="center",
                fontsize=8, weight="bold", zorder=5)

    ax.set_xlim(-8, W + 8)
    ax.set_ylim(-8, H + 8)
    ax.set_aspect("equal")
    ax.axis("off")

    n_viol = len(grade["violations"])
    color = "#2e7d32" if grade["score"] >= 85 and n_viol == 0 else (
        "#f9a825" if grade["score"] >= 70 else "#c62828")
    title = f"Score {grade['score']:.0f}/100"
    if n_viol:
        title += f"  ·  {n_viol} issue{'s' if n_viol != 1 else ''}"
    ax.set_title(title, color=color, fontsize=11, weight="bold")


def _draw_fixtures(ax, room):
    for fx in getattr(room, "fixtures", []):
        for z in fx.zones:                     # sliding-door / access clearance
            _poly(ax, z["min_poly"], facecolor="none", edgecolor="#5d4037",
                  linewidth=1.0, linestyle=":", hatch="\\\\", alpha=0.5, zorder=2)
        _poly(ax, fx.footprint, facecolor="#d7ccc8", edgecolor="#5d4037",
              linewidth=1.6, hatch="xx", zorder=3)
        c = fx.footprint.centroid
        ax.text(c.x, c.y, fx.name, ha="center", va="center", fontsize=8,
                color="#4e342e", weight="bold", zorder=4)


def _dim(v):
    """Inches -> feet'inches" label."""
    f, i = divmod(round(v), 12)
    return f"{f}'{i}\"" if i else f"{f}'"


def render_room(room, path, title="Room — please confirm"):
    """Draw the empty room with door, closet, window + dimensions for sign-off."""
    W, H = room.width, room.height
    fig, ax = plt.subplots(figsize=(8, 8))

    _draw_walls(ax, W, H)

    # openings
    for op in room.openings:
        if op.depth > 0:                       # closet recess behind the wall
            _poly(ax, op.recess_polygon(W, H), facecolor="#efe7df",
                  edgecolor="#8d6e63", linewidth=1.5, zorder=1)
        mouth = op.mouth(W, H)
        mc = mouth.centroid
        if op.kind == "closet":
            # two offset lines = sliding doors
            xs, ys = mouth.exterior.xy
            ax.plot(xs, ys, color="#5d4037", linewidth=3, zorder=3)
            ax.text(mc.x, mc.y, "closet\n(sliding)", ha="center", va="center",
                    fontsize=8, color="#5d4037", zorder=4)
        else:
            xs, ys = mouth.exterior.xy
            ax.plot(xs, ys, color="#1565c0", linewidth=4, zorder=3)
            ax.text(mc.x, mc.y, "window", ha="center", va="center", fontsize=8,
                    color="#1565c0", zorder=4)

    # built-in fixtures (protruding closet, etc.)
    _draw_fixtures(ax, room)

    # door: swing arc + open leaf + label (drawing assumes a South-wall entry)
    if room.door is not None:
        d = room.door
        _poly(ax, d.swing_polygon(W, H), facecolor="#fdece7", edgecolor="#c1694f",
              linewidth=1.4, linestyle="--", zorder=2)
        if d.wall == "S":
            hinge_x = d.offset + (0 if d.hinge == "left" else d.width)
            ax.plot([hinge_x, hinge_x], [0, d.width], color="#c1694f",
                    linewidth=3, zorder=4)  # leaf swung open, perpendicular
        ax.text(d.offset + d.width / 2, -9, "ENTRY", ha="center", va="top",
                fontsize=9, weight="bold", color="#c1694f")
        ax.annotate("", xy=(d.offset + d.width / 2, 14),
                    xytext=(d.offset + d.width / 2, -4),
                    arrowprops=dict(arrowstyle="->", color="#c1694f", lw=1.5))

    # overall dimensions
    ax.annotate("", xy=(0, -20), xytext=(W, -20),
                arrowprops=dict(arrowstyle="<->", color="#666"))
    ax.text(W / 2, -24, _dim(W), ha="center", va="top", fontsize=9, color="#444")
    ax.annotate("", xy=(-20, 0), xytext=(-20, H),
                arrowprops=dict(arrowstyle="<->", color="#666"))
    ax.text(-24, H / 2, _dim(H), ha="right", va="center", fontsize=9,
            color="#444", rotation=90)

    ax.set_xlim(-40, W + 60)
    ax.set_ylim(-40, H + 30)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(title, fontsize=13, weight="bold")
    fig.savefig(path, dpi=130, bbox_inches="tight")
    plt.close(fig)
    return path


def render_layout(layout, grade, path, show_reach=False):
    fig, ax = plt.subplots(figsize=(7, 7))
    _draw(ax, layout, grade, show_reach=show_reach)
    if grade["violations"]:
        txt = "\n".join("• " + v for v in grade["violations"][:8])
        fig.text(0.5, 0.02, txt, ha="center", va="bottom", fontsize=7,
                 color="#c62828")
        fig.subplots_adjust(bottom=0.18)
    fig.savefig(path, dpi=130, bbox_inches="tight")
    plt.close(fig)
    return path


def render_grid(results, path, cols=3, title="Top nursery layouts"):
    n = len(results)
    if n == 0:
        raise ValueError("render_grid: no layouts to draw (results is empty)")
    cols = min(cols, n)
    rows = (n + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=(6 * cols, 6 * rows))
    axes = axes.flatten() if hasattr(axes, "flatten") else [axes]
    for i, ax in enumerate(axes):
        if i < n:
            _draw(ax, results[i]["layout"], results[i]["grade"])
            ax.set_title(f"#{i+1}  ·  " + ax.get_title(),
                         color=ax.title.get_color(), fontsize=11, weight="bold")
        else:
            ax.axis("off")
    fig.suptitle(title, fontsize=15, weight="bold")
    fig.savefig(path, dpi=120, bbox_inches="tight")
    plt.close(fig)
    return path
