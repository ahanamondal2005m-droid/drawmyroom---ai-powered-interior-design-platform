/**
 * Live Clearance Engine for DrawMyRoom.
 *
 * Maps the app's PlacedObject world (center-positioned, rotated, inches) onto
 * the local roomsolver geometry and reports per-object clearance conflicts:
 * physical overlaps, door-swing blockage, egress-corridor obstruction,
 * sub-12-inch pinches, pinched clearance zones, and circulation analysis.
 *
 * Pure, synchronous, offline. Safe to import from the browser.
 */

import { PlacedObject, RoomDimensions } from '../src/types';
import {
  Furniture,
  PENALTY_PER_ZONE,
  PlacedPiece,
  Rect,
  ResolvedZone,
  Room,
  doorApproachRect,
  doorSwingRects,
  interArea,
  rect,
  rectArea,
  rectDistance,
  roomRect,
} from './roomsolver';
import { zonesForModel } from './roomsolver/rules';
import { circulationReport } from './roomsolver/scoring';

// ---------------------------------------------------------------------------
// PlacedObject (center-positioned, rotated, inches) -> engine rectangles
// ---------------------------------------------------------------------------

/** Axis-aligned world footprint of a placed object (center position in feet). */
export function objectFootprint(obj: PlacedObject): Rect {
  const cx = obj.position.x * 12;
  const cy = obj.position.y * 12;
  const L = obj.dimensions.lengthIn;
  const W = obj.dimensions.widthIn;
  const rot = ((Math.round(obj.rotation) % 360) + 360) % 360;
  let halfX: number;
  let halfY: number;
  if (rot === 90 || rot === 270) {
    halfX = W / 2;
    halfY = L / 2;
  } else if (rot === 0 || rot === 180) {
    halfX = L / 2;
    halfY = W / 2;
  } else {
    // 45-degree family: axis-aligned bounding box of the rotated rectangle
    const rad = (rot * Math.PI) / 180;
    const c = Math.abs(Math.cos(rad));
    const s = Math.abs(Math.sin(rad));
    halfX = (L * c + W * s) / 2;
    halfY = (L * s + W * c) / 2;
  }
  return { x0: cx - halfX, y0: cy - halfY, x1: cx + halfX, y1: cy + halfY };
}

/**
 * Default room shell for a DrawMyRoom project: 36" door on the south wall near
 * the east corner (as drawn in the 2D blueprint), window bay centered on the
 * north wall (furniture may sit beneath it).
 */
export function defaultRoomFor(dimensions: RoomDimensions): Room {
  const W = dimensions.lengthFt * 12;
  const H = dimensions.widthFt * 12;
  const doorWidth = 36;
  const windowWidth = Math.min(W * 0.6, 120);
  return {
    width: W,
    height: H,
    door: {
      wall: 'S',
      offset: Math.max(0, W - doorWidth - 8),
      width: doorWidth,
      hinge: 'right',
    },
    openings: [
      {
        wall: 'N',
        offset: Math.max(0, (W - windowWidth) / 2),
        width: windowWidth,
        clearance: 0,
        kind: 'window',
        blockable: true,
        label: 'window bay',
      },
    ],
  };
}

/**
 * A free-standing object graded by the engine: zones orient outward from the
 * footprint with the "front" facing the room center (wall pieces therefore
 * face into the room, matching how staged layouts are built).
 */
export function freeOrientedPiece(obj: PlacedObject, fp: Rect, room: Room): PlacedPiece {
  const cx = (fp.x0 + fp.x1) / 2;
  const cy = (fp.y0 + fp.y1) / 2;
  const dx = room.width / 2 - cx;
  const dy = room.height / 2 - cy;
  // snap the front direction to the dominant cardinal axis
  const front: 'N' | 'S' | 'E' | 'W' = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'E' : 'W') : dy >= 0 ? 'N' : 'S';
  const opposite = (d: 'N' | 'S' | 'E' | 'W'): 'N' | 'S' | 'E' | 'W' =>
    d === 'N' ? 'S' : d === 'S' ? 'N' : d === 'E' ? 'W' : 'E';
  const leftOf = front === 'N' ? 'W' : front === 'S' ? 'E' : front === 'E' ? 'N' : 'S';

  const extend = (dir: 'N' | 'S' | 'E' | 'W', depth: number): Rect => {
    switch (dir) {
      case 'N':
        return { x0: fp.x0, y0: fp.y1, x1: fp.x1, y1: fp.y1 + depth };
      case 'S':
        return { x0: fp.x0, y0: fp.y0 - depth, x1: fp.x1, y1: fp.y0 };
      case 'E':
        return { x0: fp.x1, y0: fp.y0, x1: fp.x1 + depth, y1: fp.y1 };
      case 'W':
        return { x0: fp.x0 - depth, y0: fp.y0, x1: fp.x0, y1: fp.y1 };
    }
  };

  const zones: ResolvedZone[] = zonesForModel(obj.modelType, obj.category, obj.name).map((z) => {
    const dir =
      z.side === 'front' ? front : z.side === 'back' ? opposite(front) : z.side === 'left' ? leftOf : opposite(leftOf);
    return {
      side: z.side,
      label: z.label,
      weight: z.weight,
      minDepth: z.minDepth,
      idealDepth: z.idealDepth,
      minRect: extend(dir, z.minDepth),
      idealRect: extend(dir, z.idealDepth),
    };
  });

  const furn: Furniture = {
    name: obj.name,
    w: fp.x1 - fp.x0,
    d: fp.y1 - fp.y0,
    symmetric: true,
    zones: [],
    catalogId: obj.catalogId,
    price: obj.price,
    modelType: obj.modelType,
  };
  return { furniture: furn, placement: { wall: 'S', offset: 0, flip: false }, footprint: fp, zones };
}

export interface ClearanceEntry {
  conflict: boolean;
  message?: string;
  kind: 'overlap' | 'door-swing' | 'egress-corridor' | 'pinch' | 'zone' | 'circulation';
}

export interface ClearanceResult {
  /** per object id */
  conflicts: Record<string, ClearanceEntry>;
  /** 0-100 usability score of the whole arrangement */
  score: number;
  violations: string[];
}

const TOL = 4.0;

const isRug = (o: PlacedObject): boolean => o.modelType === 'rug' || (o.category || '').toLowerCase().includes('rug');

/**
 * Compute live clearance conflicts for the current arrangement.
 *
 * `circulation: false` skips the walkway grid analysis (used during drags to
 * stay snappy); `true` (default) grades full-room circulation.
 */
export function computeClearanceConflicts(
  dimensions: RoomDimensions,
  objects: PlacedObject[],
  egressPathInches = 36,
  opts?: { circulation?: boolean }
): ClearanceResult {
  const room = defaultRoomFor(dimensions);
  const roomBox = roomRect(room);
  const W = room.width;
  const H = room.height;
  const active = objects.filter((o) => o.visible !== false);
  const conflicts: Record<string, ClearanceEntry> = {};
  const violations: string[] = [];

  const footprints = new Map<string, Rect>();
  const pieces: PlacedPiece[] = [];
  for (const o of active) {
    const fp = objectFootprint(o);
    footprints.set(o.id, fp);
    if (!isRug(o)) pieces.push(freeOrientedPiece(o, fp, room));
  }

  const swing = room.door ? doorSwingRects(room.door, W, H) : null;
  // egress corridor as drawn in the 2D blueprint (1.5 ft off the west wall)
  const corridor = rect(1.5 * 12, 12, 1.5 * 12 + egressPathInches, H - 12);

  const flag = (id: string, kind: ClearanceEntry['kind'], message: string) => {
    conflicts[id] = { conflict: true, message, kind };
    if (!violations.includes(message)) violations.push(message);
  };

  // 1. physical overlaps between footprints
  const solid = active.filter((o) => !isRug(o));
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = footprints.get(solid[i].id)!;
      const b = footprints.get(solid[j].id)!;
      if (interArea([a], [b]) > TOL) {
        flag(solid[i].id, 'overlap', `${solid[i].name} overlaps ${solid[j].name} — footprints intersect`);
        flag(solid[j].id, 'overlap', `${solid[j].name} overlaps ${solid[i].name} — footprints intersect`);
      }
    }
  }

  // 2. door swing blockage
  if (swing) {
    for (const o of solid) {
      if (interArea([footprints.get(o.id)!], swing) > TOL) {
        flag(o.id, 'door-swing', `${o.name} blocks the ${room.door?.width ?? 36}-inch door swing arc`);
      }
    }
  }

  // 3. egress corridor obstruction
  for (const o of solid) {
    const covered = interArea([footprints.get(o.id)!], [corridor]);
    if (covered > TOL && covered > 0.15 * rectArea(footprints.get(o.id)!)) {
      flag(o.id, 'egress-corridor', `${o.name} obstructs the ${egressPathInches}" primary egress corridor`);
    }
  }

  // 4. tight pinches between pairs (no pass-through at all)
  for (let i = 0; i < solid.length; i++) {
    for (let j = i + 1; j < solid.length; j++) {
      const a = footprints.get(solid[i].id)!;
      const b = footprints.get(solid[j].id)!;
      const gap = rectDistance(a, b);
      if (gap > 0 && gap < 12) {
        flag(solid[i].id, 'pinch', `only ${gap.toFixed(1)}" between ${solid[i].name} and ${solid[j].name}`);
        flag(solid[j].id, 'pinch', `only ${gap.toFixed(1)}" between ${solid[j].name} and ${solid[i].name}`);
      }
    }
  }

  // 5. clearance-zone pinches (zonesForModel supplies per-type requirements)
  let zonePenalty = 0;
  for (const p of pieces) {
    for (const z of p.zones) {
      const area = rectArea(z.minRect);
      if (area <= 0) continue;
      const inRoom = interArea([z.minRect], [roomBox]);
      const obstacles: Rect[] = [];
      for (const q of pieces) if (q !== p) obstacles.push(q.footprint);
      if (swing) obstacles.push(...swing);
      const covered = interArea([z.minRect], obstacles);
      const frac = Math.min(1.0, (area - inRoom + covered) / area);
      zonePenalty += z.weight * frac * PENALTY_PER_ZONE;
      if (frac > 0.4) {
        const obj = active.find((o) => o.id === p.furniture.catalogId || o.name === p.furniture.name);
        if (obj && !conflicts[obj.id]) {
          const clear = z.minDepth * (1 - frac);
          flag(
            obj.id,
            'zone',
            `${obj.name}: ${z.label} only ~${clear.toFixed(0)}" clear, need ${z.minDepth.toFixed(0)}"`
          );
        }
      }
    }
  }

  // 6. circulation: stranded floor behind sub-30" pinches
  let circPenalty = 0;
  if ((opts?.circulation ?? true) && pieces.length > 0) {
    const fps = pieces.map((p) => p.footprint);
    const circ = circulationReport(room, pieces, fps, swing);
    circPenalty = circ.penalty;
    violations.push(...circ.notes);
    if (circ.strandedFrac > 0.08) {
      // flag the pair forming the tightest pinch so the banner can offer a fix
      let best: { gap: number; a: string; b: string } | null = null;
      for (let i = 0; i < pieces.length; i++) {
        for (let j = i + 1; j < pieces.length; j++) {
          const g = rectDistance(fps[i], fps[j]);
          if (g < 30 && (best === null || g < best.gap)) {
            best = { gap: g, a: pieces[i].furniture.name, b: pieces[j].furniture.name };
          }
        }
      }
      if (best) {
        for (const p of pieces) {
          if (p.furniture.name === best.a || p.furniture.name === best.b) {
            const obj = active.find((o) => o.name === p.furniture.name);
            if (obj && !conflicts[obj.id]) {
              flag(
                obj.id,
                'circulation',
                `only ${best.gap.toFixed(0)}" between ${best.a} and ${best.b} — part of the room sits behind a sub-30" pinch`
              );
            }
          }
        }
      }
    }
  }

  // 7. doorway approach penalty (18" latch-side approach)
  let doorPenalty = 0;
  if (room.door) {
    const approach = doorApproachRect(room.door, W, H, 18);
    const inRoom = interArea([approach], [roomBox]);
    if (inRoom > 0) {
      const covered = interArea([approach], pieces.map((p) => p.footprint));
      const frac = Math.min(1.0, covered / inRoom);
      if (frac > 0.05) doorPenalty = frac * PENALTY_PER_ZONE;
    }
  }

  const score = Math.max(0, Math.round((100 - zonePenalty - doorPenalty - circPenalty) * 10) / 10);
  return { conflicts, score, violations };
}

/**
 * Find a nearby position for `objectId` that resolves its clearance conflicts.
 * Deterministic local search: push away from whatever it conflicts with, then
 * sweep nearby positions until the object clears.
 */
export function autoSnapClearance(
  dimensions: RoomDimensions,
  objects: PlacedObject[],
  objectId: string,
  egressPathInches = 36
): PlacedObject | null {
  const obj = objects.find((o) => o.id === objectId);
  if (!obj) return null;

  const others = objects.filter((o) => o.id !== objectId);
  const currently = computeClearanceConflicts(dimensions, objects, egressPathInches, { circulation: false });
  if (!currently.conflicts[objectId]?.conflict) return null;

  // push vector: away from the objects it overlaps or pinches
  const fp = objectFootprint(obj);
  const cx = (fp.x0 + fp.x1) / 2;
  const cy = (fp.y0 + fp.y1) / 2;
  let vx = 0;
  let vy = 0;
  for (const other of others) {
    if (other.visible === false || other.modelType === 'rug') continue;
    const ofp = objectFootprint(other);
    const ocx = (ofp.x0 + ofp.x1) / 2;
    const ocy = (ofp.y0 + ofp.y1) / 2;
    const dx = cx - ocx;
    const dy = cy - ocy;
    const d = Math.hypot(dx, dy) || 1;
    const gap = rectDistance(fp, ofp);
    if (interArea([fp], [ofp]) > TOL || gap < egressPathInches) {
      const push = (egressPathInches - gap) / 12 + 0.5; // feet
      vx += (dx / d) * push;
      vy += (dy / d) * push;
    }
  }
  if (vx === 0 && vy === 0) {
    // zone-only conflict: nudge toward room center
    vx = dimensions.lengthFt / 2 - obj.position.x;
    vy = dimensions.widthFt / 2 - obj.position.y;
    const d = Math.hypot(vx, vy) || 1;
    vx /= d;
    vy /= d;
  }

  const L = obj.dimensions.lengthIn;
  const Wd = obj.dimensions.widthIn;
  const rot = ((obj.rotation % 360) + 360) % 360;
  const swapped = rot === 90 || rot === 270;
  const halfX = ((swapped ? Wd : L) / 12) / 2;
  const halfY = ((swapped ? L : Wd) / 12) / 2;

  const clamp = (x: number, y: number) => ({
    x: Math.max(halfX, Math.min(dimensions.lengthFt - halfX, x)),
    y: Math.max(halfY, Math.min(dimensions.widthFt - halfY, y)),
  });

  const tryAt = (x: number, y: number): boolean => {
    const moved = { ...obj, position: { x, y, z: 0 } };
    const next = [...others, moved];
    const res = computeClearanceConflicts(dimensions, next, egressPathInches, { circulation: false });
    return !res.conflicts[objectId]?.conflict;
  };

  const base = clamp(obj.position.x + vx, obj.position.y + vy);
  if (tryAt(base.x, base.y)) {
    return { ...obj, position: { x: base.x, y: base.y, z: 0 } };
  }

  // sweep: push vector first, then rings of offsets around the current spot
  const dirs: [number, number][] = [
    [vx, vy],
    [vy, -vx],
    [-vy, vx],
    [-vx, -vy],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ];
  for (let step = 1; step <= 8; step++) {
    for (const [dx, dy] of dirs) {
      const len = Math.hypot(dx, dy) || 1;
      const cand = clamp(obj.position.x + (dx / len) * step, obj.position.y + (dy / len) * step);
      if (tryAt(cand.x, cand.y)) {
        return { ...obj, position: { x: cand.x, y: cand.y, z: 0 } };
      }
    }
  }
  // no perfect spot found — still return the best push (clamped)
  return { ...obj, position: { x: base.x, y: base.y, z: 0 } };
}
