/**
 * Search wall placements and rank layouts by usability.
 *
 * TypeScript port of roomsolver by Dylan Fox (MIT License, © 2026).
 * Upstream reference: vendor/roomsolver/roomsolver/solver.py
 *
 * Beam search: place the largest pieces first (best pruning), keep the top-N
 * partial layouts at each step, expand. Returns the best complete layouts.
 */

import { Furniture, Layout, Placement, PlacedPiece, Room, WALLS, resolvePiece, wallLength } from './model';
import { GradeResult, grade } from './scoring';

interface State {
  score: number;
  pieces: PlacedPiece[];
}

/** All (wall, offset, flip) placements where the piece physically fits. */
function candidates(room: Room, furn: Furniture, step: number): Placement[] {
  const out: Placement[] = [];
  const flips = !furn.symmetric ? [false, true] : [false];
  for (const wall of WALLS) {
    const along = wallLength(room, wall); // room span the width runs along
    const into = wall === 'N' || wall === 'S' ? room.height : room.width; // depth axis
    if (furn.w > along || furn.d > into) continue;
    const maxOff = along - furn.w;
    const n = Math.max(1, Math.floor(maxOff / step) + 1);
    const offsets: number[] = [];
    for (let i = 0; i < n; i++) offsets.push(Math.min(maxOff, i * step));
    if (!offsets.includes(maxOff)) offsets.push(maxOff); // always try the flush-corner spot
    for (const off of offsets) {
      for (const flip of flips) {
        out.push({ wall, offset: Math.round(off * 100) / 100, flip });
      }
    }
  }
  return out;
}

function key(pieces: PlacedPiece[]): string {
  return pieces
    .map((p) => `${p.furniture.name}|${p.placement.wall}|${Math.round(p.placement.offset)}|${p.placement.flip}`)
    .sort()
    .join(';');
}

/**
 * Coarse signature over the MAJOR pieces only (small/flexible pieces like a
 * bassinet or diaper pail don't define a distinct arrangement).
 */
function family(pieces: PlacedPiece[], bucket = 24, minArea = 800): string {
  return pieces
    .filter((p) => p.furniture.w * p.furniture.d >= minArea)
    .map((p) => `${p.furniture.name}|${p.placement.wall}|${Math.round(p.placement.offset / bucket)}`)
    .sort()
    .join(';');
}

/**
 * Family of just the largest (anchor) piece placed so far. Capping the beam
 * on this guarantees every distinct anchor placement survives to completion,
 * instead of being judged on a half-built partial score.
 */
function anchorKey(trial: PlacedPiece[], bucket: number): string {
  let p = trial[0];
  for (const q of trial) {
    if (q.furniture.w * q.furniture.d > p.furniture.w * p.furniture.d) p = q;
  }
  return `${p.furniture.name}|${p.placement.wall}|${Math.round(p.placement.offset / bucket)}|${p.placement.flip}`;
}

/**
 * Keep the top `beam` partial states, but at most `cap` from any one family
 * (per `keyfn`), so a single arrangement can't crowd out distinct alternatives.
 * Leftover slots (if few families) are back-filled by raw score.
 */
function pruneDiverse(nxt: State[], beam: number, cap: number, bucket: number, keyfn: (t: PlacedPiece[], b: number) => string): State[] {
  nxt.sort((a, b) => b.score - a.score);
  const picked: State[] = [];
  const counts = new Map<string, number>();
  const taken = new Array(nxt.length).fill(false);
  for (let i = 0; i < nxt.length; i++) {
    const fam = keyfn(nxt[i].pieces, bucket);
    const c = counts.get(fam) ?? 0;
    if (c >= cap) continue;
    counts.set(fam, c + 1);
    picked.push(nxt[i]);
    taken[i] = true;
    if (picked.length >= beam) return picked;
  }
  for (let i = 0; i < nxt.length; i++) {
    // back-fill if the cap left us short
    if (!taken[i]) {
      picked.push(nxt[i]);
      if (picked.length >= beam) break;
    }
  }
  return picked;
}

export interface SolveOptions {
  /** partial-layout beam width (upstream default 400; this port's default 160 keeps HTTP latency low) */
  beam?: number;
  /** offset sampling step in inches (upstream default 6; this port's default 12) */
  step?: number;
  /** number of distinct layouts returned */
  top?: number;
  /** de-duplicate results to distinct arrangement "families" */
  diverse?: boolean;
  /** family bucket size in inches */
  bucket?: number;
  /** max beam states per anchor placement */
  anchorCap?: number;
}

export interface SolvedLayout {
  layout: Layout;
  grade: GradeResult;
}

/**
 * Return the top-`top` layouts, each as { layout, grade }, best first.
 *
 * With `diverse: true` the results are de-duplicated to distinct arrangement
 * "families" (each piece on the same wall within a ~`bucket`-inch zone counts
 * as the same family), so you see real alternatives, not micro-variants.
 * During the search the beam is capped at `anchorCap` states per placement of
 * the largest piece, so every distinct anchor spot is carried to completion.
 */
export function solve(room: Room, furns: Furniture[], opts: SolveOptions = {}): SolvedLayout[] {
  const beam = opts.beam ?? 160;
  const step = opts.step ?? 12;
  const top = opts.top ?? 5;
  const diverse = opts.diverse ?? true;
  const bucket = opts.bucket ?? 24;
  const anchorCap = opts.anchorCap ?? 14;

  const order = [...furns].sort((a, b) => b.w * b.d - a.w * a.d);

  let states: State[] = [{ score: 0.0, pieces: [] }];
  for (const furn of order) {
    const cands = candidates(room, furn, step);
    const nxt: State[] = [];
    const seen = new Set<string>();
    for (const state of states) {
      for (const pl of cands) {
        const pp = resolvePiece(room, furn, pl);
        const trial = [...state.pieces, pp];
        const g = grade(room, trial, { partial: true });
        if (!g.feasible) continue;
        const k = key(trial);
        if (seen.has(k)) continue;
        seen.add(k);
        nxt.push({ score: g.score, pieces: trial });
      }
    }
    if (nxt.length === 0) {
      throw new Error(
        `No feasible spot for ${furn.name} given the pieces already placed. Room may be too small or too full.`
      );
    }
    states = pruneDiverse(nxt, beam, anchorCap, bucket, anchorKey);
  }

  const ranked: SolvedLayout[] = [];
  const seen = new Set<string>();
  for (const state of states) {
    const k = key(state.pieces);
    if (seen.has(k)) continue;
    seen.add(k);
    ranked.push({ layout: { room, pieces: state.pieces }, grade: grade(room, state.pieces, { partial: false }) });
  }
  // best score first; break ties by comfort (roomier clearances win)
  ranked.sort((a, b) => b.grade.score - a.grade.score || b.grade.comfort - a.grade.comfort);
  if (!diverse) return ranked.slice(0, top);

  const out: SolvedLayout[] = [];
  const seenFam = new Set<string>();
  for (const r of ranked) {
    const fam = family(r.layout.pieces, bucket);
    if (seenFam.has(fam)) continue;
    seenFam.add(fam);
    out.push(r);
    if (out.length >= top) break;
  }
  return out;
}
