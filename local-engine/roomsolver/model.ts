/**
 * Geometry model: Room, Furniture (+ clearance Zones), Placement, Layout.
 *
 * TypeScript port of roomsolver by Dylan Fox (MIT License, © 2026).
 * Upstream reference: vendor/roomsolver/roomsolver/model.py
 * Port notes: see vendor/roomsolver/MODEL_CARD.md
 *
 * Coordinate frame: origin at the room's bottom-left corner, +x right, +y up.
 * A piece is defined in a LOCAL frame with its back edge on y=0 and its front
 * face at y=depth. When placed against a wall, the back edge sits on the wall
 * and the front (drawers / access side) faces into the room.
 *
 * The upstream implementation uses shapely polygons. Because every wall and
 * clearance zone here is axis-aligned, this port represents all geometry as
 * rectangles. Sets of rectangles produced by the engine (footprints, door-swing
 * fans, grid cells) are pairwise interior-disjoint by construction, so exact
 * rectangle algebra replaces polygon unions.
 */

// ---------------------------------------------------------------------------
// Rectangle algebra (replaces shapely)
// ---------------------------------------------------------------------------

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function rect(x0: number, y0: number, x1: number, y1: number): Rect {
  return {
    x0: Math.min(x0, x1),
    y0: Math.min(y0, y1),
    x1: Math.max(x0, x1),
    y1: Math.max(y0, y1),
  };
}

export function rectArea(r: Rect): number {
  return Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
}

/** Area of a set of rectangles known to be pairwise interior-disjoint. */
export function disjointArea(rs: Rect[]): number {
  let a = 0;
  for (const r of rs) a += rectArea(r);
  return a;
}

export function rectInterArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * Intersection area between two sets of rectangles that are each pairwise
 * interior-disjoint (true for everything the engine builds: feasible layouts
 * never overlap footprints, the door-swing fan tiles, grid cells never
 * overlap). Falls back to a conservative over-count otherwise, which mirrors
 * the upstream TOL tolerance for hairline overlaps.
 */
export function interArea(a: Rect[], b: Rect[]): number {
  let s = 0;
  for (const p of a) for (const q of b) s += rectInterArea(p, q);
  return s;
}

/** Euclidean distance between two rects (0 if they overlap). */
export function rectDistance(a: Rect, b: Rect): number {
  const dx = Math.max(0, Math.max(a.x0 - b.x1, b.x0 - a.x1));
  const dy = Math.max(0, Math.max(a.y0 - b.y1, b.y0 - a.y1));
  return Math.hypot(dx, dy);
}

export function expandRect(r: Rect, pad: number): Rect {
  return { x0: r.x0 - pad, y0: r.y0 - pad, x1: r.x1 + pad, y1: r.y1 + pad };
}

export function pointInRect(x: number, y: number, r: Rect): boolean {
  return x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1;
}

// ---------------------------------------------------------------------------
// Walls, zones, furniture, placements
// ---------------------------------------------------------------------------

export const WALLS = ['S', 'N', 'W', 'E'] as const; // bottom, top, left, right
export type Wall = (typeof WALLS)[number];

export type ZoneSide = 'front' | 'back' | 'left' | 'right';

/** A directional clearance requirement attached to one side of a piece. */
export interface Zone {
  side: ZoneSide; // which local edge the clearance extends from
  minDepth: number; // inches that MUST be clear for the piece to be usable
  idealDepth: number; // inches for a comfortable layout (earns comfort credit)
  label: string; // e.g. "drawer pull-out"
  weight: number; // importance of the zone, scales its penalty
}

export function flipZone(z: Zone): Zone {
  const swap: Record<ZoneSide, ZoneSide> = { left: 'right', right: 'left', front: 'front', back: 'back' };
  return { ...z, side: swap[z.side] };
}

export interface Furniture {
  name: string;
  /** width along the wall (back/front edge) */
  w: number;
  /** depth, wall to front face */
  d: number;
  zones: Zone[];
  color?: string;
  /** true -> no point trying the flipped placement */
  symmetric: boolean;
  /** a baby sleep surface (crib/bassinet) -> not under a window (upstream) */
  sleep?: boolean;
  // ---- port extension: DrawMyRoom catalog metadata for cost-cap staging ----
  catalogId?: string;
  price?: number;
  modelType?: string;
}

export const canFlip = (f: Furniture): boolean => !f.symmetric;

export interface Placement {
  wall: Wall;
  /** distance along the wall from the origin corner */
  offset: number;
  flip: boolean;
}

// ---- local -> world transform ----------------------------------------------

/**
 * Map a local-frame rectangle to world coords for a wall placement.
 * Local frame: footprint x in [0,w], y in [0,d]; front face is the y=d edge.
 * In every wall case the front face ends up pointing into the room.
 */
export function placeRect(r: Rect, wall: Wall, offset: number, W: number, H: number, w: number, d: number): Rect {
  switch (wall) {
    case 'S': // bottom wall, front faces +y
      return rect(offset + r.x0, r.y0, offset + r.x1, r.y1);
    case 'N': // top wall, front faces -y
      return rect(offset + w - r.x1, H - r.y1, offset + w - r.x0, H - r.y0);
    case 'W': // left wall, front faces +x
      return rect(r.y0, offset + w - r.x1, r.y1, offset + w - r.x0);
    case 'E': // right wall, front faces -x
      return rect(W - r.y1, offset + r.x0, W - r.y0, offset + r.x1);
  }
}

/** Rectangle extending `depth` outward from one local edge of the footprint. */
export function localZoneRect(side: ZoneSide, w: number, d: number, depth: number): Rect {
  switch (side) {
    case 'front':
      return rect(0, d, w, d + depth);
    case 'back':
      return rect(0, -depth, w, 0);
    case 'left':
      return rect(-depth, 0, 0, d);
    case 'right':
      return rect(w, 0, w + depth, d);
  }
}

// ---------------------------------------------------------------------------
// Doors and openings
// ---------------------------------------------------------------------------

export interface Door {
  wall: Wall;
  /** position of the hinge-side jamb along the wall */
  offset: number;
  width: number;
  /** which end of the opening the hinge is on ('left'/'right' along wall dir) */
  hinge: 'left' | 'right';
}

export const SWING_STEPS = 16;

/**
 * Quarter-circle the door leaf sweeps, approximated by a fan of 16 thin
 * rectangles (upstream draws the true arc with shapely). The fan rectangles
 * are pairwise interior-disjoint, so rectangle algebra stays exact.
 */
export function doorSwingRects(door: Door, W: number, H: number): Rect[] {
  const out: Rect[] = [];
  const w = door.width;
  for (let i = 0; i < SWING_STEPS; i++) {
    const aLo = (Math.PI / 2) * (i / SWING_STEPS);
    const aHi = (Math.PI / 2) * ((i + 1) / SWING_STEPS);
    const cLo = w * Math.cos(aLo);
    const cHi = w * Math.cos(aHi);
    const sHi = w * Math.sin(aHi);
    let local: Rect;
    if (door.hinge === 'left') {
      local = rect(cHi, 0, cLo, sHi);
    } else {
      local = rect(w - cLo, 0, w - cHi, sHi);
    }
    out.push(placeRect(local, door.wall, door.offset, W, H, w, w));
  }
  return out;
}

/** Clear-approach box in front of the opening (both sides of the door). */
export function doorApproachRect(door: Door, W: number, H: number, depth: number): Rect {
  return placeRect(rect(0, 0, door.width, depth), door.wall, door.offset, W, H, door.width, depth);
}

/**
 * A closet or window on a wall that needs front clearance. `depth` (optional)
 * is how far the cavity extends behind the wall — drawing only.
 */
export interface Opening {
  wall: Wall;
  offset: number;
  width: number;
  /** inches of clear floor needed in front of it */
  clearance: number;
  kind: 'closet' | 'window';
  /** cavity behind the wall, for drawing (outside the room) */
  depth?: number;
  /** true -> furniture may sit against/in front of it */
  blockable?: boolean;
  /** optional drawing label */
  label?: string;
  /** >0 -> no baby sleep surface within this many inches (safety) */
  noSleepWithin?: number;
}

/** Thin sliver on the wall line covering the opening. */
export function mouthRect(op: Opening, W: number, H: number): Rect {
  return placeRect(rect(0, -1, op.width, 0), op.wall, op.offset, W, H, op.width, 1);
}

/** Rectangle of the given depth in front of the opening, into the room. */
export function frontZoneRect(op: Opening, W: number, H: number, depth: number): Rect {
  return placeRect(rect(0, 0, op.width, depth), op.wall, op.offset, W, H, op.width, depth);
}

export function openingClearanceRect(op: Opening, W: number, H: number): Rect {
  return frontZoneRect(op, W, H, op.clearance);
}

/** The cavity behind the wall, for drawing (outside the room). */
export function recessRect(op: Opening, W: number, H: number): Rect {
  const d = op.depth ?? 0;
  const o = op.offset;
  const w = op.width;
  switch (op.wall) {
    case 'S':
      return rect(o, -d, o + w, 0);
    case 'N':
      return rect(o, H, o + w, H + d);
    case 'W':
      return rect(-d, o, 0, o + w);
    case 'E':
      return rect(W, o, W + d, o + w);
  }
}

// ---------------------------------------------------------------------------
// Room, pieces, layout
// ---------------------------------------------------------------------------

export interface Room {
  /** x extent (inches) */
  width: number;
  /** y extent (inches) */
  height: number;
  door?: Door;
  /** windows, closets, ... */
  openings?: Opening[];
  /** built-in PlacedPieces */
  fixtures?: PlacedPiece[];
}

export function roomRect(room: Room): Rect {
  return rect(0, 0, room.width, room.height);
}

export function wallLength(room: Room, wall: Wall): number {
  return wall === 'N' || wall === 'S' ? room.width : room.height;
}

export interface ResolvedZone {
  side: ZoneSide;
  label: string;
  weight: number;
  minDepth: number;
  idealDepth: number;
  minRect: Rect;
  idealRect: Rect;
}

/** A Furniture pinned to a Placement inside a Room — resolved to world geometry. */
export interface PlacedPiece {
  furniture: Furniture;
  placement: Placement;
  footprint: Rect;
  zones: ResolvedZone[];
}

/** Resolve a furniture + placement into world geometry (upstream Room.resolve). */
export function resolvePiece(room: Room, furn: Furniture, pl: Placement): PlacedPiece {
  const W = room.width;
  const H = room.height;
  const w = furn.w;
  const d = furn.d;
  const footprint = placeRect(rect(0, 0, w, d), pl.wall, pl.offset, W, H, w, d);
  const zones: ResolvedZone[] = furn.zones.map((z0) => {
    const z = pl.flip ? flipZone(z0) : z0;
    return {
      side: z.side,
      label: z.label,
      weight: z.weight,
      minDepth: z.minDepth,
      idealDepth: z.idealDepth,
      minRect: placeRect(localZoneRect(z.side, w, d, z.minDepth), pl.wall, pl.offset, W, H, w, d),
      idealRect: placeRect(localZoneRect(z.side, w, d, z.idealDepth), pl.wall, pl.offset, W, H, w, d),
    };
  });
  return { furniture: furn, placement: pl, footprint, zones };
}

export interface Layout {
  room: Room;
  pieces: PlacedPiece[];
}

export function layoutFootprints(layout: Layout): Rect[] {
  return layout.pieces.map((p) => p.footprint);
}
