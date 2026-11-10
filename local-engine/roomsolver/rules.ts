/**
 * Clearance rulebook + furniture library.
 *
 * TypeScript port of roomsolver by Dylan Fox (MIT License, © 2026).
 * Upstream reference: vendor/roomsolver/roomsolver/rules.py
 *
 * Numbers are design-standard clearances (inches), sourced from interior-design
 * spacing guides. Each furniture piece carries its own clearance ZONES so the
 * scorer can grade usability objectively.
 *
 * Sources:
 *   - RoomSketch clearance guide
 *   - Homes & Gardens bedroom clearances
 *   - Rocabu dresser / wardrobe spacing
 */

import { Furniture, Zone } from './model';

// ---- generic circulation clearances (inches) --------------------------------
export const WALKWAY_MAIN_MIN = 36; // primary path through the room
export const WALKWAY_MAIN_IDEAL = 42;
export const WALKWAY_SECONDARY_MIN = 30; // squeeze path between two pieces
export const DOOR_APPROACH = 18; // clear approach on the latch side of a door

// Feet <-> inches helper (rooms are usually spec'd in feet).
export function ft(feet: number, inches = 0): number {
  return feet * 12 + inches;
}

// ---- upstream default furniture library (nursery set, kept for parity) ------

export function library(): Record<string, Furniture> {
  return {
    crib: {
      name: 'Crib',
      w: 52,
      d: 28,
      color: '#f4c7c3',
      symmetric: false,
      sleep: true,
      zones: [
        { side: 'front', minDepth: 30, idealDepth: 36, label: 'reach-in / lift baby', weight: 1.4 },
        { side: 'left', minDepth: 24, idealDepth: 30, label: 'side access', weight: 0.5 },
      ],
    },
    bassinet: {
      name: 'Bassinet',
      w: 33,
      d: 19,
      color: '#f9e0a2',
      symmetric: true,
      sleep: true,
      zones: [{ side: 'front', minDepth: 24, idealDepth: 30, label: 'bedside access', weight: 1.0 }],
    },
    dresser: {
      name: 'Dresser / changer',
      w: 36,
      d: 20,
      color: '#bfe3c0',
      symmetric: true,
      zones: [{ side: 'front', minDepth: 30, idealDepth: 36, label: 'drawer pull-out + changing', weight: 1.5 }],
    },
    glider: {
      name: 'Glider',
      w: 30,
      d: 34,
      color: '#c9c2ec',
      symmetric: true,
      zones: [{ side: 'front', minDepth: 20, idealDepth: 28, label: 'footrest / rocking swing', weight: 1.0 }],
    },
    twin_bed: {
      name: 'Twin bed',
      w: 38,
      d: 75,
      color: '#cfd8dc',
      symmetric: false,
      zones: [
        { side: 'left', minDepth: 30, idealDepth: 36, label: 'get-in side', weight: 1.0 },
        { side: 'front', minDepth: 24, idealDepth: 30, label: 'foot clearance', weight: 0.4 },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// DrawMyRoom extension: clearance templates keyed by catalog modelType
//
// The upstream library is a nursery set; this app stages living rooms,
// bedrooms, dining rooms and offices. These templates keep the same zone
// grammar (side / min / ideal / weight) so the upstream scorer grades them
// unchanged.
// ---------------------------------------------------------------------------

const zone = (side: Zone['side'], minDepth: number, idealDepth: number, label: string, weight = 1.0): Zone => ({
  side,
  minDepth,
  idealDepth,
  label,
  weight,
});

/**
 * Clearance zones for a catalog piece, by modelType (with category / name
 * fallbacks for custom items that carry no modelType).
 */
export function zonesForModel(modelType: string | undefined, category: string | undefined, name: string): Zone[] {
  const cat = (category || '').toLowerCase();
  const nm = name.toLowerCase();
  const isSeating = modelType === 'sofa' || modelType === 'chair' || cat.includes('seating');
  const isStorage = modelType === 'credenza' || cat.includes('storage');
  const isTable = modelType === 'table' || cat.includes('table');
  const isBed = nm.includes('bed') || cat.includes('bed');
  const isDesk = nm.includes('desk') || cat.includes('desk');

  if (isBed) {
    return [
      zone('front', 24, 30, 'foot-of-bed clearance', 0.4),
      zone('left', 30, 36, 'get-in side', 1.0),
      zone('right', 30, 36, 'get-in side', 1.0),
    ];
  }
  if (isDesk) {
    return [zone('front', 30, 42, 'chair pull-out + work zone', 1.3)];
  }
  if (isStorage) {
    return [zone('front', 30, 36, 'drawer pull-out', 1.5)];
  }
  if (modelType === 'sofa') {
    return [
      zone('front', 18, 30, 'seating approach', 1.2),
      zone('left', 12, 18, 'side passage', 0.3),
      zone('right', 12, 18, 'side passage', 0.3),
    ];
  }
  if (isSeating) {
    return [zone('front', 18, 28, 'seating approach', 1.0)];
  }
  if (isTable) {
    // tables are center pieces; zones apply to the pull-out space around them
    return [zone('front', 30, 36, 'chair pull-out', 1.1)];
  }
  // lamps, rugs, and small generic pieces carry no directional clearance
  return [];
}

/**
 * Build an engine Furniture from a catalog-like item (structurally compatible
 * with DrawMyRoom's CatalogItem and with PlacedObject). `w` runs along the
 * wall, `d` is depth from wall to front face.
 */
export interface CatalogLike {
  id?: string;
  name: string;
  category?: string;
  modelType?: string;
  price?: number;
  dimensions: { lengthIn: number; widthIn: number; heightIn?: number };
}

export function furnitureFromCatalogItem(item: CatalogLike): Furniture {
  const nm = (item.name || '').toLowerCase();
  const cat = (item.category || '').toLowerCase();
  const isBed = nm.includes('bed') || cat.includes('bed');
  const lengthIn = item.dimensions.lengthIn;
  const widthIn = item.dimensions.widthIn;
  // Beds are longer into the room; everything else runs its long side
  // along the wall.
  const w = isBed ? Math.min(lengthIn, widthIn) : Math.max(lengthIn, widthIn);
  const d = isBed ? Math.max(lengthIn, widthIn) : Math.min(lengthIn, widthIn);
  return {
    name: item.name,
    w,
    d,
    symmetric: true,
    zones: zonesForModel(item.modelType, item.category, item.name),
    catalogId: item.id,
    price: item.price,
    modelType: item.modelType,
    color: '#b9c6d6',
  };
}
