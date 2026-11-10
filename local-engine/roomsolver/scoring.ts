/**
 * Grade a layout for usability.
 *
 * TypeScript port of roomsolver by Dylan Fox (MIT License, © 2026).
 * Upstream reference: vendor/roomsolver/roomsolver/scoring.py
 *
 * A layout is FEASIBLE only if nothing physically conflicts (pieces inside the
 * room, no overlaps, nothing blocking the door swing or a closet mouth). Among
 * feasible layouts, the score rewards keeping every clearance zone open and
 * penalizes the ones that are pinched.
 *
 * Upstream computes circulation with shapely buffer(-15") erosion/dilation.
 * This port approximates it on a coarse 6-inch grid: a cell is walkable-core
 * when the 30-inch square around it is entirely free, connectivity is a
 * flood-fill from the doorway, and dilation is a 15-inch (5-cell) growth.
 */

import {
  Door,
  Layout,
  Opening,
  PlacedPiece,
  Rect,
  Room,
  doorApproachRect,
  doorSwingRects,
  expandRect,
  frontZoneRect,
  interArea,
  mouthRect,
  pointInRect,
  rectArea,
  rectDistance,
  roomRect,
} from './model';
import * as rules from './rules';

export const TOL = 4.0; // in^2, ignore hairline geometric overlaps
export const PENALTY_PER_ZONE = 22.0; // cost of a fully-blocked, unit-weight min clearance
export const COMFORT_CAP = 8.0;

// ---- circulation (walkways) -------------------------------------------------
export const WALK_COMFORT = 30.0; // a comfortable path / gap to walk through (inches)
export const WALK_R = WALK_COMFORT / 2; // person modeled as a disk of this radius
export const CIRC_FLOOR_W = 50.0; // penalty scale for floor cut off by a pinch
export const CIRC_ACCESS_W = 40.0; // penalty scale for a piece you must squeeze to reach
export const CIRC_CAP = 70.0; // max total circulation penalty
export const MIN_WALK_AREA = 200.0; // in^2, ignore tiny eroded nubs as "walkable"

/** Grid cell size for circulation analysis (inches). */
export const CELL = 6;
const R_CELLS = Math.round(WALK_R / CELL); // 2 -> 5x5 window = 30" square

export interface GradeResult {
  feasible: boolean;
  score: number; // 0-100
  penalty: number;
  comfort: number;
  violations: string[];
  perPiece: { name: string; notes: string[] }[];
}

function infeasible(reason: string): GradeResult {
  return {
    feasible: false,
    score: 0.0,
    penalty: 999.0,
    comfort: 0.0,
    violations: [reason],
    perPiece: [],
  };
}

/** Tightest walk-sized gap between two pieces (10-30"), for a readable note. */
export function closestPinch(pieces: PlacedPiece[], fps: Rect[]): { gap: number; a: string; b: string } | null {
  let best: { gap: number; a: string; b: string } | null = null;
  for (let i = 0; i < fps.length; i++) {
    for (let j = i + 1; j < fps.length; j++) {
      const g = rectDistance(fps[i], fps[j]);
      if (g >= 10.0 && g < WALK_COMFORT && (best === null || g < best.gap)) {
        best = { gap: g, a: pieces[i].furniture.name, b: pieces[j].furniture.name };
      }
    }
  }
  return best;
}

// ---- grid circulation (approximates shapely buffer erosion/dilation) -------

interface Grid {
  nx: number;
  ny: number;
  free: boolean[][];
}

function buildGrid(room: Room, obstacleRects: Rect[]): Grid {
  const nx = Math.max(1, Math.ceil(room.width / CELL));
  const ny = Math.max(1, Math.ceil(room.height / CELL));
  const free: boolean[][] = [];
  for (let j = 0; j < ny; j++) {
    const row: boolean[] = new Array(nx);
    for (let i = 0; i < nx; i++) {
      const cx = (i + 0.5) * CELL;
      const cy = (j + 0.5) * CELL;
      let f = true;
      for (const r of obstacleRects) {
        if (pointInRect(cx, cy, r)) {
          f = false;
          break;
        }
      }
      row[i] = f;
    }
    free.push(row);
  }
  return { nx, ny, free };
}

/** A cell is kept when the 5x5 (30") window around it is entirely `true`. */
function erode(mask: boolean[][], nx: number, ny: number): boolean[][] {
  const out: boolean[][] = [];
  for (let j = 0; j < ny; j++) {
    const row: boolean[] = new Array(nx).fill(false);
    for (let i = 0; i < nx; i++) {
      if (!mask[j][i]) continue;
      let ok = true;
      for (let dj = -R_CELLS; dj <= R_CELLS && ok; dj++) {
        const jj = j + dj;
        if (jj < 0 || jj >= ny) {
          ok = false;
          break;
        }
        for (let di = -R_CELLS; di <= R_CELLS; di++) {
          const ii = i + di;
          if (ii < 0 || ii >= nx || !mask[jj][ii]) {
            ok = false;
            break;
          }
        }
      }
      row[i] = ok;
    }
    out.push(row);
  }
  return out;
}

/** Cells within a Chebyshev distance of R_CELLS of any `true` cell. */
function dilate(mask: boolean[][], nx: number, ny: number): boolean[][] {
  const out: boolean[][] = [];
  for (let j = 0; j < ny; j++) {
    const row: boolean[] = new Array(nx).fill(false);
    for (let i = 0; i < nx; i++) {
      if (row[i]) continue;
      outer: for (let dj = -R_CELLS; dj <= R_CELLS; dj++) {
        const jj = j + dj;
        if (jj < 0 || jj >= ny) continue;
        for (let di = -R_CELLS; di <= R_CELLS; di++) {
          const ii = i + di;
          if (ii >= 0 && ii < nx && mask[jj][ii]) {
            row[i] = true;
            break outer;
          }
        }
      }
    }
    out.push(row);
  }
  return out;
}

function cellArea(count: number): number {
  return count * CELL * CELL;
}

function maskToRects(mask: boolean[][], nx: number, ny: number): Rect[] {
  const out: Rect[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (mask[j][i]) out.push({ x0: i * CELL, y0: j * CELL, x1: (i + 1) * CELL, y1: (j + 1) * CELL });
    }
  }
  return out;
}

function countMask(mask: boolean[][]): number {
  let n = 0;
  for (const row of mask) for (const v of row) if (v) n++;
  return n;
}

export interface CirculationReport {
  freeArea: number;
  reachableArea: number;
  strandedFrac: number;
  reachableRects: Rect[];
  freeRects: Rect[];
  notes: string[];
  penalty: number;
}

/**
 * Analyze walkability: `reachable` is the floor you can actually stand on
 * having walked in from the doorway using only >=30"-wide paths. Floor outside
 * it is stranded behind a pinch — you'd have to squeeze to get there.
 */
export function circulationReport(room: Room, pieces: PlacedPiece[], fps: Rect[], doorSwing: Rect[] | null): CirculationReport {
  const obstacles = doorSwing ? [...fps, ...doorSwing] : fps;
  const { nx, ny, free } = buildGrid(room, obstacles);
  const freeCount = countMask(free);
  const freeArea = cellArea(freeCount);
  const notes: string[] = [];

  if (freeCount === 0) {
    return {
      freeArea: 0,
      reachableArea: 0,
      strandedFrac: 1,
      reachableRects: [],
      freeRects: [],
      notes: ['The room is completely filled — nowhere to walk'],
      penalty: CIRC_CAP,
    };
  }

  const core = erode(free, nx, ny);
  // connected components of the eroded core, 4-connected flood fill
  const compId: number[][] = Array.from({ length: ny }, () => new Array(nx).fill(-1));
  const compCells: number[][] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (!core[j][i] || compId[j][i] !== -1) continue;
      const id = compCells.length;
      const cells: number[] = [];
      const stack: [number, number][] = [[i, j]];
      compId[j][i] = id;
      while (stack.length) {
        const [ci, cj] = stack.pop()!;
        cells.push(cj * nx + ci);
        const nb: [number, number][] = [
          [ci + 1, cj],
          [ci - 1, cj],
          [ci, cj + 1],
          [ci, cj - 1],
        ];
        for (const [ni, nj] of nb) {
          if (ni < 0 || ni >= nx || nj < 0 || nj >= ny) continue;
          if (core[nj][ni] && compId[nj][ni] === -1) {
            compId[nj][ni] = id;
            stack.push([ni, nj]);
          }
        }
      }
      compCells.push(cells);
    }
  }

  const comps = compCells.filter((c) => cellArea(c.length) >= MIN_WALK_AREA);
  if (comps.length === 0) {
    return {
      freeArea,
      reachableArea: 0,
      strandedFrac: 1,
      reachableRects: [],
      freeRects: maskToRects(free, nx, ny),
      notes: ["You can't get into the room without squeezing"],
      penalty: CIRC_CAP,
    };
  }

  // seed: components reachable from a person standing just inside the doorway
  let seed: number[] | null = null;
  if (room.door) {
    const entry = doorApproachRect(room.door, room.width, room.height, WALK_COMFORT + 12);
    const entryCells = new Set<number>();
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (free[j][i] && pointInRect((i + 0.5) * CELL, (j + 0.5) * CELL, entry)) {
          entryCells.add(j * nx + i);
        }
      }
    }
    const grown = dilate(
      Array.from({ length: ny }, (_, j) => Array.from({ length: nx }, (_, i) => entryCells.has(j * nx + i))),
      nx,
      ny
    );
    seed = [];
    comps.forEach((cells, idx) => {
      if (cells.some((c) => grown[Math.floor(c / nx)][c % nx])) seed!.push(idx);
    });
  } else {
    let bestIdx = 0;
    for (let idx = 1; idx < comps.length; idx++) {
      if (comps[idx].length > comps[bestIdx].length) bestIdx = idx;
    }
    seed = [bestIdx];
  }

  const coreReach: boolean[][] = Array.from({ length: ny }, () => new Array(nx).fill(false));
  if (seed.length === 0) {
    return {
      freeArea,
      reachableArea: 0,
      strandedFrac: 1,
      reachableRects: [],
      freeRects: maskToRects(free, nx, ny),
      notes: ["You can't get into the room without squeezing"],
      penalty: CIRC_CAP,
    };
  }
  for (const idx of seed) {
    for (const c of comps[idx]) coreReach[Math.floor(c / nx)][c % nx] = true;
  }

  const reachDilated = dilate(coreReach, nx, ny);
  const reachable: boolean[][] = Array.from({ length: ny }, (_, j) =>
    Array.from({ length: nx }, (_, i) => free[j][i] && reachDilated[j][i])
  );
  const reachableRects = maskToRects(reachable, nx, ny);
  const reachableArea = cellArea(countMask(reachable));

  // (a) stranded walkable floor
  const stranded: boolean[][] = Array.from({ length: ny }, (_, j) =>
    Array.from({ length: nx }, (_, i) => free[j][i] && !reachable[j][i])
  );
  const strandedWalk = erode(stranded, nx, ny);
  const freeWalk = erode(free, nx, ny);
  const strandedWalkArea = cellArea(countMask(strandedWalk));
  const freeWalkArea = cellArea(countMask(freeWalk));
  const frac = Math.min(1.0, strandedWalkArea / Math.max(1.0, freeWalkArea));

  let penalty = CIRC_FLOOR_W * frac;
  if (frac > 0.02) {
    const pinch = closestPinch(pieces, fps);
    if (pinch) {
      notes.push(`only ${pinch.gap.toFixed(0)}" between ${pinch.a} and ${pinch.b} — tight to walk through`);
    }
    notes.push('part of the room sits behind a sub-30" pinch');
  }

  // (b) a piece's front access stranded — you'd squeeze to use it
  const roomPoly = roomRect(room);
  for (const p of pieces) {
    for (const z of p.zones) {
      if (z.side !== 'front') continue;
      const area = rectArea(z.minRect);
      if (area <= 0) continue;
      const inRoom = interArea([z.minRect], [roomPoly]);
      if (inRoom <= 0) continue;
      const reachArea = interArea([z.minRect], reachableRects);
      const short_ = 1 - Math.min(inRoom, reachArea) / inRoom;
      if (short_ > 0.15) {
        penalty += z.weight * CIRC_ACCESS_W * short_;
        notes.push(`${p.furniture.name}: must squeeze past furniture to reach the ${z.label}`);
      }
    }
  }

  return {
    freeArea,
    reachableArea,
    strandedFrac: frac,
    reachableRects,
    freeRects: maskToRects(free, nx, ny),
    notes,
    penalty: Math.min(CIRC_CAP, penalty),
  };
}

// ---- the grader --------------------------------------------------------------

/**
 * Grade a list of PlacedPiece against a Room.
 *
 * `partial: true` skips the "everything is placed" comforts so the solver can
 * score work-in-progress beam states.
 */
export function grade(room: Room, piecesIn: PlacedPiece[], opts?: { partial?: boolean }): GradeResult {
  const partial = opts?.partial ?? false;
  // built-in fixtures act as fixed obstacles AND get their own clearances
  const pieces = [...(room.fixtures ?? []), ...piecesIn];
  const fps = pieces.map((p) => p.footprint);
  const roomPoly = roomRect(room);
  const violations: string[] = [];
  const perPiece: { name: string; notes: string[] }[] = [];

  // ---- HARD feasibility ----------------------------------------------------
  // 1. each footprint inside the room
  for (const p of pieces) {
    const outside = rectArea(p.footprint) - interArea([p.footprint], [roomPoly]);
    if (outside > TOL) return infeasible(`${p.furniture.name} sticks out past a wall`);
  }
  // 2. no footprint-on-footprint overlap
  for (let i = 0; i < fps.length; i++) {
    for (let j = i + 1; j < fps.length; j++) {
      if (interArea([fps[i]], [fps[j]]) > TOL) {
        return infeasible(`${pieces[i].furniture.name} overlaps ${pieces[j].furniture.name}`);
      }
    }
  }
  // 3. nothing blocking the door swing
  const doorSwing = room.door ? doorSwingRects(room.door, room.width, room.height) : null;
  if (doorSwing) {
    for (const p of pieces) {
      if (interArea([p.footprint], doorSwing) > TOL) {
        return infeasible(`${p.furniture.name} blocks the door swing`);
      }
    }
  }
  // 4. nothing covering a closet/window mouth (unless it's blockable)
  for (const op of room.openings ?? []) {
    if (op.blockable) continue;
    const mouth = expandRect(mouthRect(op, room.width, room.height), 2);
    for (const p of pieces) {
      if (interArea([p.footprint], [mouth]) > TOL) {
        return infeasible(`${p.furniture.name} blocks the ${op.label || op.kind}`);
      }
    }
  }
  // 5. no baby sleep surface too close to a flagged opening (upstream safety rule)
  for (const op of room.openings ?? []) {
    if (!op.noSleepWithin || op.noSleepWithin <= 0) continue;
    const zonePoly = frontZoneRect(op, room.width, room.height, op.noSleepWithin);
    for (const p of pieces) {
      if (p.furniture.sleep && interArea([p.footprint], [zonePoly]) > TOL) {
        return infeasible(`${p.furniture.name} is under the ${op.label || op.kind} (baby safety)`);
      }
    }
  }

  // ---- SOFT usability grading ----------------------------------------------
  let penalty = 0.0;
  let comfort = 0.0;

  // Everything a clearance zone can be blocked by: the other footprints and
  // the door swing. Feasible footprints are pairwise disjoint, so pairwise
  // rectangle sums are exact (see MODEL_CARD.md port notes).
  const obstacleUnion: Rect[] = doorSwing ? [...fps, ...doorSwing] : fps;

  const blockedFrac = (poly: Rect): number => {
    const area = rectArea(poly);
    if (area <= 0) return 0.0;
    const outsideRoom = area - interArea([poly], [roomPoly]);
    const onObstacles = interArea([poly], obstacleUnion);
    return Math.min(1.0, (outsideRoom + onObstacles) / area);
  };

  for (const p of pieces) {
    const pieceNotes: string[] = [];
    for (const z of p.zones) {
      if (rectArea(z.minRect) <= 0) continue;
      const frac = blockedFrac(z.minRect);
      penalty += z.weight * frac * PENALTY_PER_ZONE;

      // approximate clear depth for a human-readable message
      if (frac > 0.05) {
        const clearDepth = z.minDepth * (1 - frac);
        const msg = `${p.furniture.name}: ${z.label} only ~${clearDepth.toFixed(0)}" clear, need ${z.minDepth.toFixed(0)}"`;
        violations.push(msg);
        pieceNotes.push(msg);
      }

      // comfort credit: how much of the *ideal* zone is open
      if (rectArea(z.idealRect) > 0) {
        comfort += z.weight * (1 - blockedFrac(z.idealRect));
      }
    }
    perPiece.push({ name: p.furniture.name, notes: pieceNotes });
  }

  const clearancePenalty = (zonePoly: Rect, message: string): void => {
    const inRoom = interArea([zonePoly], [roomPoly]);
    if (fps.length === 0 || inRoom <= 0) return;
    const covered = interArea([zonePoly], fps);
    const frac = Math.min(1.0, covered / inRoom);
    if (frac > 0.05) {
      penalty += frac * PENALTY_PER_ZONE;
      violations.push(message.replace('{pct}', (frac * 100).toFixed(0)));
    }
  };

  if (room.door) {
    clearancePenalty(
      doorApproachRect(room.door, room.width, room.height, rules.DOOR_APPROACH),
      'Doorway approach {pct}% obstructed'
    );
  }
  for (const op of room.openings ?? []) {
    clearancePenalty(
      frontZoneRect(op, room.width, room.height, op.clearance),
      `${op.kind.charAt(0).toUpperCase()}${op.kind.slice(1)} clearance {pct}% blocked`
    );
  }

  // Circulation: only on complete layouts (a partial layout has open gaps
  // that aren't real walkways yet).
  if (!partial) {
    const circ = circulationReport(room, pieces, fps, doorSwing);
    penalty += circ.penalty;
    violations.push(...circ.notes);
  }

  const comfortBonus = Math.min(COMFORT_CAP, comfort);
  const score = Math.max(0.0, 100.0 - penalty);
  return {
    feasible: true,
    score: Math.round(score * 10) / 10,
    penalty: Math.round(penalty * 10) / 10,
    comfort: Math.round(comfortBonus * 10) / 10,
    violations,
    perPiece,
  };
}

/** Convenience: grade a Layout object. */
export function gradeLayout(layout: Layout, opts?: { partial?: boolean }): GradeResult {
  return grade(layout.room, layout.pieces, opts);
}
