export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP';
export type DimensionUnit = 'ft' | 'm';

export interface RoomDimensions {
  lengthFt: number;
  widthFt: number;
  ceilingHeightFt: number;
  unit: DimensionUnit;
}

export interface PlacedObject {
  id: string;
  catalogId: string;
  name: string;
  category: string;
  dimensions: {
    lengthIn: number;
    widthIn: number;
    heightIn: number;
  };
  position: {
    x: number; // in feet relative to room origin
    y: number; // in feet
    z?: number;
  };
  rotation: number; // in degrees
  price: number;
  material: string;
  vendor: string;
  anchorType?: 'L-ANCHOR' | 'WALL-ANCHOR' | 'FREE' | 'FLOOR';
  clearanceConflict?: boolean;
  conflictMessage?: string;
  visible?: boolean;
  modelType?: 'sofa' | 'table' | 'credenza' | 'lamp' | 'rug' | 'chair' | 'generic';
}

export interface CatalogItem {
  id: string;
  name: string;
  category: 'All Seating' | 'Tables & Desks' | 'Lighting (Architectural)' | 'Rugs & Textiles' | 'Storage & Media';
  dimensions: {
    lengthIn: number;
    widthIn: number;
    heightIn: number;
  };
  price: number;
  leadTime: string;
  vendor: string;
  description: string;
  material: string;
  fitScore: number;
  tags: string[];
  image: string;
  modelType: 'sofa' | 'table' | 'credenza' | 'lamp' | 'rug' | 'chair' | 'generic';
  sku: string;
}

export interface MaterialItem {
  id: string;
  plane: string;
  name: string;
  category: 'FLOORING' | 'WALL FINISH' | 'METALS';
  origin: string;
  pricePerSqFt: number;
  roughness: number;
  normalDepthMm: number;
  vocRating: string;
  scratchIndex: string;
  slipResistance: string;
  color: string;
  warranty: string;
  activeMaps?: {
    albedo: boolean;
    rough: boolean;
    normal: boolean;
    resolution: string;
  };
}

export interface LuminaireFixture {
  id: string;
  name: string;
  type: string;
  lumens: number;
  cct: string;
  powerWatts: number;
  status: 'Active' | 'Dimmed' | 'Standby';
}

export interface LightingConfig {
  solarOrientationDeg: number;
  altitudeDeg: number;
  directDni: number;
  zenithLux: number;
  diurnalTime: string;
  casementWidthFt: number;
  casementHeightFt: number;
  windowToWallRatio: number;
  glazingSpec: string;
  linenDrapeDiffusion: boolean;
  totalLumenBudget: number;
  allocatedLumens: number;
  daylightLumens: number;
  artificialLumens: number;
  activeLuminaires: LuminaireFixture[];
  circadianScorePercent: number;
}

export interface ProjectSketch {
  uploaded: boolean;
  url: string;
  fileName: string;
  detectedFeatures: {
    walls: number;
    doors: number;
    windows: number;
    usableAreaSqFt: number;
    confidence: string;
    aspectRatio: string;
    orientation: string;
  };
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  roomType: string;
  dimensions: RoomDimensions;
  budget: {
    totalCap: number;
    committed: number;
    currency: CurrencyCode;
  };
  sketch: ProjectSketch;
  clearanceSettings: {
    egressPathInches: number;
    doorArcSwing: boolean;
  };
  placedObjects: PlacedObject[];
  materialSpecs: {
    activePlane: string;
    activeMaterialId: string;
    materials: MaterialItem[];
  };
  lightingConfig: LightingConfig;
  createdAt: string;
  updatedAt: string;
}

export interface DesignVariation {
  id: string;
  projectId: string;
  name: string;
  style: string;
  timestamp: string;
  totalCost: number;
  piecesCount: number;
  snapshotData: {
    dimensions: RoomDimensions;
    placedObjects: PlacedObject[];
    materials: MaterialItem[];
    lightingConfig: LightingConfig;
  };
}

export interface DesignerProfile {
  id: string;
  name: string;
  title: string;
  location: string;
  experienceYears: number;
  rating: number;
  reviewsCount: number;
  specialties: string[];
  hourlyRate: number;
  portfolioImages: string[];
  bio: string;
  verified: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  studioName: string;
  preferredCurrency: CurrencyCode;
  preferredUnit: DimensionUnit;
}
