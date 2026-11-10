/**
 * Local room staging for DrawMyRoom.
 *
 * Runs the roomsolver beam search over catalog pieces to produce a complete,
 * clearance-verified furniture arrangement that respects the Spatial Cost
 * Cap. Wall pieces (seating, storage, desks) are placed by the solver; center
 * pieces (coffee tables, dining tables, rugs, lamps) are placed by a
 * deterministic free-space search around the solved anchors.
 *
 * Server-side module (imports the catalog); no network, no API keys.
 */

import { PlacedObject } from '../src/types';
import { CATALOG_ITEMS } from '../src/data/mockData';
import {
  CatalogLike,
  Furniture,
  PlacedPiece,
  Rect,
  Room,
  doorSwingRects,
  furnitureFromCatalogItem,
  interArea,
  rect,
  rectDistance,
} from './roomsolver';
import { solve } from './roomsolver/solver';
import { grade } from './roomsolver/scoring';
import { defaultRoomFor } from './clearance';

export interface StageRoomInput {
  roomType?: string;
  dimensions: { lengthFt: number; widthFt: number; ceilingHeightFt?: number };
  budgetCap?: number;
  stylePreference?: string;
}

export interface StagedItemNote {
  item: string;
  placement: string;
  reason: string;
}

export interface StagingPlan {
  styleName: string;
  fitScore: number;
  conceptSummary: string;
  recommendedLayout: StagedItemNote[];
  colorPalette: string[];
  materialRecommendations: string;
  /** ready-to-apply placements in DrawMyRoom's PlacedObject format */
  placements: PlacedObject[];
  /** pieces excluded from the plan and why (budget / spatial) */
  skipped: { name: string; reason: string }[];
  solverNotes: string[];
}

const WALL_NAMES: Record<string, string> = { S: 'south', N: 'north', W: 'west', E: 'east' };

/** Pieces prioritized per room type, most essential first. */
function stagingSet(roomType: string): string[] {
  const t = (roomType || '').toLowerCase();
  if (t.includes('dining')) {
    return ['furn_table_tivoli', 'furn_chair_doze', 'furn_chair_doze', 'furn_credenza_aurelia_cat', 'furn_lum_post'];
  }
  if (t.includes('bed')) {
    return ['furn_credenza_aurelia_cat', 'furn_chair_doze', 'furn_lum_post', 'furn_rug_ribbed'];
  }
  if (t.includes('office') || t.includes('studio') || t.includes('work')) {
    return ['furn_desk_nelson', 'furn_chair_doze', 'furn_credenza_aurelia_cat', 'furn_lum_post', 'furn_rug_ribbed'];
  }
  // default: living room / loft lounge
  return [
    'furn_sofa_nocturne_cat',
    'furn_table_tivoli',
    'furn_chair_doze',
    'furn_credenza_aurelia_cat',
    'furn_lum_post',
    'furn_rug_ribbed',
  ];
}

const isWallPiece = (item: CatalogLike): boolean => {
  const mt = item.modelType ?? '';
  const cat = (item.category ?? '').toLowerCase();
  const nm = (item.name ?? '').toLowerCase();
  return (
    mt === 'sofa' ||
    mt === 'chair' ||
    mt === 'credenza' ||
    cat.includes('storage') ||
    cat.includes('seating') ||
    nm.includes('desk')
  );
};

const PALETTES: { match: string[]; palette: string[] }[] = [
  {
    match: ['japandi'],
    palette: ['#D9C5A1', '#6B5B4E', '#2E2A26', '#A6977F', '#8C7A5B'],
  },
  {
    match: ['industrial'],
    palette: ['#2B2B2B', '#8A6E4B', '#5A6472', '#C0B7A4', '#3E3A34'],
  },
  {
    match: ['scandinavian', 'scandi', 'nordic'],
    palette: ['#F2F0EB', '#C9B99B', '#6E6A5E', '#94A7B7', '#E4DCCB'],
  },
];

function paletteFor(style: string): string[] {
  const s = (style || '').toLowerCase();
  for (const p of PALETTES) {
    if (p.match.some((m) => s.includes(m))) return p.palette;
  }
  return ['#1C212B', '#E5855E', '#D9C5B2', '#4A3525', '#8E9AAF'];
}

// ---------------------------------------------------------------------------
// Center-piece placement (deterministic free-space search)
// ---------------------------------------------------------------------------

interface CenterCandidate {
  fp: Rect;
  rotation: number;
  gap: number;
}

function centerCandidates(room: Room, obstacles: Rect[], w: number, d: number, rotations: number[]): CenterCandidate[] {
  const out: CenterCandidate[] = [];
  const step = 6;
  for (const rotation of rotations) {
    const swap = rotation === 90 || rotation === 270;
    const fw = swap ? d : w; // extent along x
    const fd = swap ? w : d; // extent along y
    for (let cx = fw / 2; cx <= room.width - fw / 2 + 0.01; cx += step) {
      for (let cy = fd / 2; cy <= room.height - fd / 2 + 0.01; cy += step) {
        const fp = rect(cx - fw / 2, cy - fd / 2, cx + fw / 2, cy + fd / 2);
        if (obstacles.some((o) => interArea([fp], [o]) > 4)) continue;
        let gap = Math.min(cx - fw / 2, room.width - (cx + fw / 2), cy - fd / 2, room.height - (cy + fd / 2));
        for (const o of obstacles) gap = Math.min(gap, rectDistance(fp, o));
        out.push({ fp, rotation, gap });
      }
    }
  }
  return out;
}

function bestCenterCandidate(
  room: Room,
  obstacles: Rect[],
  furn: Furniture,
  mode: 'coffee' | 'dining' | 'lamp' | 'rug' | 'generic',
  coffee?: { sofaFp: Rect; lateralAxis: 'x' | 'y'; sofaCenter: number }
): { fp: Rect; rotation: number; gap: number } | null {
  const rotations = mode === 'coffee' || mode === 'dining' ? [0, 90] : [0];
  let cands = centerCandidates(room, obstacles, furn.w, furn.d, rotations);
  if (mode === 'rug') {
    // rugs may sit under furniture: only require the rug to fit the room
    const fw = furn.w;
    const fd = furn.d;
    if (fw > room.width || fd > room.height) return null;
    cands = [{ fp: rect((room.width - fw) / 2, (room.height - fd) / 2, (room.width + fw) / 2, (room.height + fd) / 2), rotation: 0, gap: 0 }];
  } else if (mode === 'lamp') {
    const inset = 20;
    const corners: CenterCandidate[] = [];
    for (const [cx, cy] of [
      [inset + furn.w / 2, inset + furn.d / 2],
      [room.width - inset - furn.w / 2, inset + furn.d / 2],
      [inset + furn.w / 2, room.height - inset - furn.d / 2],
      [room.width - inset - furn.w / 2, room.height - inset - furn.d / 2],
    ]) {
      const fp = rect(cx - furn.w / 2, cy - furn.d / 2, cx + furn.w / 2, cy + furn.d / 2);
      if (obstacles.some((o) => interArea([fp], [o]) > 4)) continue;
      let gap = Infinity;
      for (const o of obstacles) gap = Math.min(gap, rectDistance(fp, o));
      corners.push({ fp, rotation: 0, gap });
    }
    if (corners.length === 0) return null;
    return corners.reduce((best, c) => (c.gap > best.gap ? c : best));
  }
  if (cands.length === 0) return null;

  if (coffee) {
    // coffee table: a ~16" working gap from the sofa, roughly on its centerline
    const cost = (c: CenterCandidate): number => {
      const gap = rectDistance(c.fp, coffee.sofaFp);
      const lateral =
        coffee.lateralAxis === 'x'
          ? Math.abs((c.fp.x0 + c.fp.x1) / 2 - coffee.sofaCenter)
          : Math.abs((c.fp.y0 + c.fp.y1) / 2 - coffee.sofaCenter);
      // hard-penalize gaps under 10" (flush / overlapping the sofa)
      return Math.abs(gap - 16) + lateral * 0.4 + Math.max(0, 10 - gap) * 3;
    };
    return cands.reduce((best, c) => (cost(c) < cost(best) ? c : best));
  }
  // dining / generic: maximize breathing room
  return cands.reduce((best, c) => (c.gap > best.gap ? c : best));
}

// ---------------------------------------------------------------------------
// The staging pipeline
// ---------------------------------------------------------------------------

export function stageRoom(input: StageRoomInput): StagingPlan {
  const room = defaultRoomFor({
    lengthFt: input.dimensions.lengthFt,
    widthFt: input.dimensions.widthFt,
    ceilingHeightFt: input.dimensions.ceilingHeightFt ?? 10,
    unit: 'ft',
  });
  // The 2D blueprint keeps a primary egress corridor 1.5 ft off the west
  // wall. Model it as a fixed fixture so the solver never stages a wall
  // piece across it (pieces shallower than 18" still fit against the W wall).
  const H = room.height;
  room.fixtures = [
    {
      furniture: { name: 'primary egress corridor', w: 36, d: Math.max(0, H - 24), symmetric: true, zones: [] },
      placement: { wall: 'W', offset: 12, flip: false },
      footprint: rect(18, 12, 18 + 36, H - 12),
      zones: [],
    },
  ];
  const budgetCap = input.budgetCap ?? 2200;
  const styleName = input.stylePreference || 'Modern Minimalist';
  const roomType = input.roomType || 'Living Room';

  // 1. pick catalog pieces in priority order, honoring the Spatial Cost Cap
  const skipped: { name: string; reason: string }[] = [];
  const chosen: typeof CATALOG_ITEMS = [];
  let committed = 0;
  for (const id of stagingSet(roomType)) {
    const item = CATALOG_ITEMS.find((c) => c.id === id);
    if (!item) continue;
    if (committed + item.price > budgetCap) {
      skipped.push({ name: item.name, reason: `exceeds spatial cost cap (${item.price} vs ${budgetCap - committed} remaining)` });
      continue;
    }
    chosen.push(item);
    committed += item.price;
  }
  if (chosen.length === 0) {
    // extremely tight budget: take the single cheapest piece that fits
    const cheapest = [...CATALOG_ITEMS].sort((a, b) => a.price - b.price)[0];
    if (cheapest && cheapest.price <= budgetCap) {
      chosen.push(cheapest);
      committed = cheapest.price;
    }
  }

  // 2. solve wall pieces with the beam search
  const wallItems = chosen.filter(isWallPiece);
  const centerItems = chosen.filter((c) => !isWallPiece(c));
  const wallFurns = wallItems.map(furnitureFromCatalogItem);

  let wallPieces: PlacedPiece[] = [];
  const solverNotes: string[] = [];
  let attempt = [...wallFurns];
  while (attempt.length > 0) {
    try {
      const results = solve(room, attempt, { top: 1 });
      wallPieces = results[0].layout.pieces;
      break;
    } catch (err) {
      // drop the smallest piece and retry (room too small or too full)
      const dropped = attempt.reduce((sm, f) => (f.w * f.d < sm.w * sm.d ? f : sm), attempt[0]);
      attempt = attempt.filter((f) => f !== dropped);
      skipped.push({
        name: dropped.name,
        reason: 'no feasible wall placement left in this room (spatially too tight)',
      });
      solverNotes.push(`${dropped.name} dropped: ${(err as Error).message}`);
    }
  }

  // 3. center pieces around the solved anchors
  const placed: PlacedPiece[] = [...wallPieces];
  const obstacles = () => {
    const swing = room.door ? doorSwingRects(room.door, room.width, room.height) : [];
    return [...(room.fixtures ?? []).map((f) => f.footprint), ...placed.map((p) => p.footprint), ...swing];
  };

  const sofa = wallPieces.find((p) => p.furniture.modelType === 'sofa');
  /** coffee-table context: target a ~16" gap from the sofa, on its centerline */
  let coffeeCtx: { sofaFp: Rect; lateralAxis: 'x' | 'y'; sofaCenter: number } | undefined;
  if (sofa) {
    const scx = (sofa.footprint.x0 + sofa.footprint.x1) / 2;
    const scy = (sofa.footprint.y0 + sofa.footprint.y1) / 2;
    coffeeCtx = {
      sofaFp: sofa.footprint,
      lateralAxis: sofa.placement.wall === 'S' || sofa.placement.wall === 'N' ? 'x' : 'y',
      sofaCenter: sofa.placement.wall === 'S' || sofa.placement.wall === 'N' ? scx : scy,
    };
  }

  const centerRecords: { furn: Furniture; fp: Rect; rotation: number }[] = [];
  for (const item of centerItems) {
    const furn = furnitureFromCatalogItem(item);
    const isRug = furn.modelType === 'rug';
    const isLamp = furn.modelType === 'lamp';
    const isCoffee = furn.modelType === 'table' && !!coffeeCtx;
    const mode: 'coffee' | 'dining' | 'lamp' | 'rug' | 'generic' = isRug
      ? 'rug'
      : isLamp
      ? 'lamp'
      : isCoffee
      ? 'coffee'
      : (input.roomType || '').toLowerCase().includes('dining') && furn.modelType === 'table'
      ? 'dining'
      : 'generic';
    const best = bestCenterCandidate(room, mode === 'rug' ? [] : obstacles(), furn, mode, isCoffee ? coffeeCtx : undefined);
    if (!best) {
      skipped.push({ name: furn.name, reason: 'no clear floor space for a center placement' });
      continue;
    }
    centerRecords.push({ furn, fp: best.fp, rotation: best.rotation });
    if (!isRug) placed.push({
      furniture: furn,
      placement: { wall: 'S', offset: 0, flip: false },
      footprint: best.fp,
      zones: [],
    });
  }

  // 4. grade the complete arrangement (rug included as a non-obstacle)
  const graded = grade(room, placed);

  // 5. assemble DrawMyRoom PlacedObjects
  const placements: PlacedObject[] = [];
  let n = 0;
  const WALL_ROT: Record<string, number> = { S: 0, W: 90, N: 180, E: 270 };
  for (const piece of wallPieces) {
    const item = wallItems.find((i) => i.name === piece.furniture.name);
    if (!item) continue;
    placements.push(toPlacedObject(item, piece.footprint, WALL_ROT[piece.placement.wall], 'WALL-ANCHOR', ++n));
  }
  for (const rec of centerRecords) {
    const item = centerItems.find((i) => i.name === rec.furn.name);
    if (!item) continue;
    placements.push(
      toPlacedObject(item, rec.fp, rec.rotation, rec.furn.modelType === 'rug' ? 'FLOOR' : 'FREE', ++n)
    );
  }

  // 6. human-readable plan (committed reflects what actually got placed)
  const committedFinal = placements.reduce((acc, p) => acc + p.price, 0);
  const recommendedLayout: StagedItemNote[] = placements.map((p) => {
    const piece = [...wallPieces].find((w) => w.furniture.name === p.name);
    let placementDesc = 'centered in free circulation zone';
    if (piece) {
      placementDesc = `${WALL_NAMES[piece.placement.wall]} wall, ${Math.round(piece.placement.offset)}" from the origin corner`;
    } else if (p.modelType === 'rug') {
      placementDesc = 'floor plane, centered under the seating cluster';
    } else if (p.modelType === 'lamp') {
      placementDesc = 'free corner with maximum clearance';
    } else if (coffeeCtx && p.modelType === 'table') {
      placementDesc = 'floating ~16" in front of the primary seating anchor';
    }
    const note = graded.perPiece.find((pp) => pp.name === p.name && pp.notes.length > 0);
    const reason = note ? note.notes[0] : 'clearance zones and door swing verified feasible';
    return { item: p.name, placement: placementDesc, reason };
  });

  const materials = [...new Set(placements.map((p) => p.material))].slice(0, 4);
  const conceptSummary = `${styleName} plan staged entirely offline by the local roomsolver engine: ${placements.length} pieces at ${Math.round(
    room.width / 12
  )}' × ${Math.round(room.height / 12)}' — layout usability ${graded.score}/100 with ${graded.violations.length} clearance notes, ${Math.round(
    committedFinal
  )} of ${Math.round(budgetCap)} committed against the spatial cost cap.`;

  return {
    styleName,
    fitScore: graded.score,
    conceptSummary,
    recommendedLayout,
    colorPalette: paletteFor(styleName),
    materialRecommendations: materials.length > 0 ? materials.join(' paired with ') + '.' : 'Catalog-specified materials.',
    placements,
    skipped,
    solverNotes: [
      `beam search: ${wallFurns.length} wall pieces solved (beam=160, step=12", anchor-capped diversity)`,
      ...solverNotes,
      ...(graded.violations.length > 0 ? graded.violations.slice(0, 5) : []),
    ],
  };
}

function toPlacedObject(
  item: CatalogLike & { material?: string; vendor?: string },
  fp: Rect,
  rotation: number,
  anchorType: PlacedObject['anchorType'],
  n: number
): PlacedObject {
  return {
    id: `stg_${String(n).padStart(2, '0')}`,
    catalogId: item.id ?? '',
    name: item.name,
    category: item.category ?? 'Furniture',
    dimensions: {
      lengthIn: item.dimensions.lengthIn,
      widthIn: item.dimensions.widthIn,
      heightIn: item.dimensions.heightIn ?? 18,
    },
    position: {
      x: Math.round((((fp.x0 + fp.x1) / 2) / 12) * 100) / 100,
      y: Math.round((((fp.y0 + fp.y1) / 2) / 12) * 100) / 100,
      z: 0,
    },
    rotation,
    price: item.price ?? 0,
    material: item.material ?? 'Contract Spec',
    vendor: item.vendor ?? 'Contract Sourced',
    anchorType,
    visible: true,
    modelType: (item as { modelType?: PlacedObject['modelType'] }).modelType,
  };
}
