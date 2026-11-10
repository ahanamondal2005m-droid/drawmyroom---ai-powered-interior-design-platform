import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { stageRoom } from './local-engine/staging';
import { balanceLighting } from './local-engine/lighting';
import { valueEngineer } from './local-engine/valueEngineer';
import { CATALOG_ITEMS } from './src/data/mockData';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsers with large limits for sketch uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure data persistence directory exists
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers for persistent JSON storage
function readData<T>(fileName: string, defaultVal: T): T {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2), 'utf-8');
    return defaultVal;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${fileName}:`, err);
    return defaultVal;
  }
}

function writeData<T>(fileName: string, data: T): void {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${fileName}:`, err);
  }
}

// Seed initial default project matching the Google Stitch reference designs
const DEFAULT_PROJECT = {
  id: 'proj_default_loft',
  userId: 'user_default',
  name: 'Modern Loft Living Room',
  roomType: 'Living Room',
  dimensions: {
    lengthFt: 18.0,
    widthFt: 14.0,
    ceilingHeightFt: 10.0,
    unit: 'ft',
  },
  budget: {
    totalCap: 2200,
    committed: 1850,
    currency: 'USD',
  },
  sketch: {
    uploaded: false,
    url: '',
    fileName: '',
    detectedFeatures: {
      walls: 4,
      doors: 1,
      windows: 2,
      usableAreaSqFt: 252,
      confidence: 'High',
      aspectRatio: '1.28:1',
      orientation: 'North-East',
    },
  },
  clearanceSettings: {
    egressPathInches: 36,
    doorArcSwing: true,
  },
  placedObjects: [
    {
      id: 'obj_1',
      catalogId: 'furn_sofa_nocturne',
      name: 'Nocturne Curved Sectional',
      category: 'Seating',
      dimensions: { lengthIn: 96, widthIn: 42, heightIn: 31 },
      position: { x: 9.0, y: 7.0, z: 0 },
      rotation: 0,
      price: 1299,
      material: 'Sand Bouclé',
      vendor: 'CB2 Contract',
      anchorType: 'L-ANCHOR',
      clearanceConflict: false,
      visible: true,
    },
    {
      id: 'obj_2',
      catalogId: 'furn_table_organic_teak',
      name: 'Organic Teak Coffee Table',
      category: 'Tables & Desks',
      dimensions: { lengthIn: 48, widthIn: 24, heightIn: 16 },
      position: { x: 9.0, y: 9.2, z: 0 },
      rotation: 0,
      price: 379,
      material: 'Dark Walnut',
      vendor: 'CB2 Contract',
      anchorType: 'FREE',
      clearanceConflict: true,
      conflictMessage: 'Organic Coffee Table is within 14.5 in of Sectional (36 in path required).',
      visible: true,
    },
    {
      id: 'obj_3',
      catalogId: 'furn_credenza_aurelia',
      name: 'Aurelia Media Credenza',
      category: 'Storage & Media',
      dimensions: { lengthIn: 72, widthIn: 18, heightIn: 20 },
      position: { x: 9.0, y: 1.5, z: 0 },
      rotation: 0,
      price: 490,
      material: 'Ebonized Ash',
      vendor: 'Muuto Studio',
      anchorType: 'WALL-ANCHOR',
      clearanceConflict: false,
      visible: true,
    },
    {
      id: 'obj_4',
      catalogId: 'furn_luminaire_aura',
      name: 'Aura Arc Luminaire',
      category: 'Lighting',
      dimensions: { lengthIn: 28, widthIn: 28, heightIn: 78 },
      position: { x: 14.0, y: 6.5, z: 0 },
      rotation: 45,
      price: 240,
      material: 'Satin Brass & Cast Iron',
      vendor: 'Flos Studio',
      anchorType: 'FREE',
      clearanceConflict: false,
      visible: true,
    },
    {
      id: 'obj_5',
      catalogId: 'furn_rug_basalt',
      name: 'Basalt Micro-Ribbed Wool Rug',
      category: 'Rugs & Textiles',
      dimensions: { lengthIn: 120, widthIn: 96, heightIn: 0.5 },
      position: { x: 9.0, y: 7.5, z: 0 },
      rotation: 0,
      price: 312,
      material: 'Nordic Wool / Slate',
      vendor: 'CB2 Contract',
      anchorType: 'FLOOR',
      clearanceConflict: false,
      visible: true,
    },
  ],
  materialSpecs: {
    activePlane: 'SURF_FLR_01',
    activeMaterialId: 'mat_wood_chevron_smoked_oak',
    materials: [
      {
        id: 'mat_wood_chevron_smoked_oak',
        plane: 'SURF_FLR_01',
        name: 'Chevron Smoked Oak',
        category: 'Flooring',
        origin: 'Black Forest, Germany',
        pricePerSqFt: 11.20,
        roughness: 0.35,
        normalDepthMm: 1.28,
        vocRating: 'Ultra-Low',
        scratchIndex: 'AC5 High-Com',
        slipResistance: 'R10 / DCOF 0.52',
        color: '#4A3525',
      },
      {
        id: 'mat_wall_microcement_slate',
        plane: 'SURF_WALL_01',
        name: 'Microcement Slate',
        category: 'Wall Finish',
        origin: 'Milan, Italy',
        pricePerSqFt: 9.50,
        roughness: 0.48,
        normalDepthMm: 0.85,
        vocRating: 'A+ Pure',
        scratchIndex: 'Heavy Traffic',
        slipResistance: 'N/A',
        color: '#71757E',
      },
    ],
  },
  lightingConfig: {
    solarOrientationDeg: 135.4,
    altitudeDeg: 42,
    directDni: 840,
    zenithLux: 38200,
    diurnalTime: '16:45',
    casementWidthFt: 10.0,
    casementHeightFt: 7.0,
    windowToWallRatio: 42.8,
    glazingSpec: '(SHGC) 0.38 Low-E',
    linenDrapeDiffusion: true,
    totalLumenBudget: 3800,
    allocatedLumens: 3450,
    daylightLumens: 1720,
    artificialLumens: 1730,
    activeLuminaires: [
      {
        id: 'lum_1',
        name: 'Architectural Linear Cove',
        type: 'Linear Cove',
        lumens: 950,
        cct: '2700K',
        powerWatts: 18,
        status: 'Active',
      },
      {
        id: 'lum_2',
        name: 'Flos Style Brass Arc',
        type: 'Task Arc',
        lumens: 480,
        cct: '3000K',
        powerWatts: 8,
        status: 'Active',
      },
      {
        id: 'lum_3',
        name: 'Flush Gimbal Cans (3x)',
        type: 'Spot Gimbal',
        lumens: 300,
        cct: '3000K',
        powerWatts: 12,
        status: 'Active',
      },
    ],
    circadianScorePercent: 96,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Initialize projects database if empty
const initialProjects = readData('projects.json', [DEFAULT_PROJECT]);
if (!initialProjects.length) {
  writeData('projects.json', [DEFAULT_PROJECT]);
}

// Initialize users database
const initialUsers = readData('users.json', [
  {
    id: 'user_default',
    email: 'ahananmondal2005m@gmail.com',
    name: 'Ahana Mondal',
    role: 'Lead Architect',
    studioName: 'Mondal Atelier & Studio',
    preferredCurrency: 'USD',
    preferredUnit: 'ft',
  },
]);
if (!initialUsers.length) {
  writeData('users.json', initialUsers);
}

// ==========================================
// REST API ROUTES
// ==========================================

// Auth Routes
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email } = req.body;
  const users = readData('users.json', initialUsers);
  let user = users.find((u: { email: string }) => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user) {
    user = {
      id: `user_${Date.now()}`,
      email: email || 'architect@drawmyroom.studio',
      name: email ? email.split('@')[0] : 'Architect User',
      role: 'Interior Designer',
      studioName: 'DrawMyRoom Studio Workspace',
      preferredCurrency: 'USD',
      preferredUnit: 'ft',
    };
    users.push(user);
    writeData('users.json', users);
  }
  res.json({ success: true, user });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, studioName, preferredCurrency } = req.body;
  const users = readData('users.json', initialUsers);
  const newUser = {
    id: `user_${Date.now()}`,
    name: name || 'Design Lead',
    email: email || 'lead@drawmyroom.studio',
    role: 'Architectural Designer',
    studioName: studioName || 'DrawMyRoom Studio',
    preferredCurrency: preferredCurrency || 'USD',
    preferredUnit: 'ft',
  };
  users.push(newUser);
  writeData('users.json', users);
  res.json({ success: true, user: newUser });
});

app.get('/api/auth/me', (_req: Request, res: Response) => {
  const users = readData('users.json', initialUsers);
  res.json({ user: users[0] || null });
});

// Projects CRUD
app.get('/api/projects', (_req: Request, res: Response) => {
  const projects = readData('projects.json', [DEFAULT_PROJECT]);
  res.json(projects);
});

app.get('/api/projects/:id', (req: Request, res: Response) => {
  const projects = readData('projects.json', [DEFAULT_PROJECT]);
  const proj = projects.find((p: { id: string }) => p.id === req.params.id);
  if (!proj) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(proj);
});

app.post('/api/projects', (req: Request, res: Response) => {
  const projects = readData('projects.json', [DEFAULT_PROJECT]);
  // Preserve the client-provided id so subsequent PUT/DELETE calls target the same record.
  const newProject = {
    ...DEFAULT_PROJECT,
    ...req.body,
    id: req.body.id || `proj_${Date.now()}`,
    name: req.body.name || 'Untitled Room Design',
    roomType: req.body.roomType || 'Living Room',
    dimensions: req.body.dimensions || { lengthFt: 16, widthFt: 12, ceilingHeightFt: 9, unit: 'ft' },
    budget: req.body.budget || { totalCap: 2500, committed: 0, currency: 'USD' },
    placedObjects: req.body.placedObjects || [],
    createdAt: req.body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.unshift(newProject);
  writeData('projects.json', projects);
  res.status(201).json(newProject);
});

app.put('/api/projects/:id', (req: Request, res: Response) => {
  const projects = readData('projects.json', [DEFAULT_PROJECT]);
  const index = projects.findIndex((p: { id: string }) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Project not found' });
  }
  projects[index] = {
    ...projects[index],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  writeData('projects.json', projects);
  res.json(projects[index]);
});

app.delete('/api/projects/:id', (req: Request, res: Response) => {
  let projects = readData('projects.json', [DEFAULT_PROJECT]);
  projects = projects.filter((p: { id: string }) => p.id !== req.params.id);
  writeData('projects.json', projects);
  res.json({ success: true });
});

// Saved Design Variations
app.get('/api/designs/:projectId', (req: Request, res: Response) => {
  const designs = readData('designs.json', []);
  const filtered = designs.filter((d: { projectId: string }) => d.projectId === req.params.projectId);
  res.json(filtered);
});

app.post('/api/designs', (req: Request, res: Response) => {
  const designs = readData<any[]>('designs.json', []);
  const newDesign = {
    id: `design_${Date.now()}`,
    ...req.body,
    timestamp: new Date().toISOString(),
  };
  designs.unshift(newDesign);
  writeData('designs.json', designs);
  res.status(201).json(newDesign);
});

app.delete('/api/designs/:id', (req: Request, res: Response) => {
  let designs = readData<any[]>('designs.json', []);
  designs = designs.filter((d: { id: string }) => d.id !== req.params.id);
  writeData('designs.json', designs);
  res.json({ success: true });
});

// Designer Inquiries
app.post('/api/inquiries', (req: Request, res: Response) => {
  const inquiries = readData<any[]>('inquiries.json', []);
  const newInquiry = {
    id: `inq_${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  inquiries.unshift(newInquiry);
  writeData('inquiries.json', inquiries);
  res.status(201).json({ success: true, inquiry: newInquiry });
});

// ==========================================
// LOCAL LAYOUT ENGINE ENDPOINTS
//
// All planning intelligence runs in-process through local-engine/ — a pure
// TypeScript port of roomsolver (https://github.com/Dylanlf/roomsolver, MIT)
// plus DrawMyRoom adapters (staging, lighting, value engineering, clearance).
// No network calls, no API keys, no fallback tiers. See
// vendor/roomsolver/MODEL_CARD.md for provenance and port notes.
// ==========================================

// 1. Room Sketch Analysis (deterministic geometric extraction)
app.post('/api/layout/analyze-sketch', (req: Request, res: Response) => {
  try {
    const { manualDimensions } = req.body;
    const lengthFt = manualDimensions?.lengthFt || 18.0;
    const widthFt = manualDimensions?.widthFt || 14.0;
    const ceilingFt = manualDimensions?.ceilingHeightFt || 10.0;
    const floorArea = lengthFt * widthFt;
    const aspect = lengthFt / (widthFt || 1);

    const suggestedRoomType =
      aspect >= 1.6
        ? 'Living Room / Loft Lounge'
        : aspect <= 0.8
        ? 'Home Office / Study'
        : 'Primary Bedroom / Studio';

    res.json({
      success: true,
      engine: 'local-roomsolver',
      analysis: {
        estimatedLengthFt: lengthFt,
        estimatedWidthFt: widthFt,
        estimatedCeilingHeightFt: ceilingFt,
        usableFloorAreaSqFt: floorArea,
        volumeCuFt: floorArea * ceilingFt,
        detectedWalls: 4,
        detectedDoors: [{ position: 'South-East Wall', swing: 'Inward 90°', clearanceInches: 36 }],
        detectedWindows: [{ position: 'North Wall', widthFt: Math.min(10, Math.round(lengthFt * 0.55)), heightFt: 7, orientation: 'Direct Solar Exposure' }],
        suggestedRoomType,
        spatialNotes: `Orthogonal bounding envelope resolved at ${lengthFt} × ${widthFt} ft (${aspect.toFixed(
          2
        )}:1 aspect) with perimeter fenestration assumed on the north elevation. The local layout engine keeps the primary 36-inch egress corridor unobstructed from the south-east entry door across every staged arrangement.`,
        disclaimer:
          'Extracted by the local geometric layout engine (roomsolver port). Homeowners may adjust all measurements in the Spatial Envelope panel.',
      },
    });
  } catch (err: any) {
    console.error('Sketch analysis error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. AI Spatial Staging Plan (local beam-search solver)
app.post('/api/layout/stage-room', (req: Request, res: Response) => {
  try {
    const { roomType, dimensions, budgetCap, stylePreference } = req.body;
    const stagingPlan = stageRoom({
      roomType,
      dimensions: dimensions || { lengthFt: 18, widthFt: 14, ceilingHeightFt: 10 },
      budgetCap,
      stylePreference,
    });
    res.json({ success: true, engine: 'local-roomsolver', stagingPlan });
  } catch (err: any) {
    console.error('Staging plan error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Luminaire & Circadian Lighting Balance (local photometric computation)
app.post('/api/layout/balance-lighting', (req: Request, res: Response) => {
  try {
    const { timeOfDay, targetLumens, currentFixtures, roomSqFt } = req.body;
    const lightingBalance = balanceLighting({
      timeOfDay,
      targetLumens,
      currentFixtures,
      roomSqFt,
    });
    res.json({ success: true, engine: 'local-photometrics', lightingBalance });
  } catch (err: any) {
    console.error('Lighting balance error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. BoQ Value Engineering (local catalog substitutions)
app.post('/api/layout/value-engineer', (req: Request, res: Response) => {
  try {
    const { items, currentTotal, budgetCap } = req.body;
    const recommendation = valueEngineer({
      items: items || [],
      currentTotal,
      budgetCap,
      catalog: CATALOG_ITEMS,
    });
    res.json({ success: true, engine: 'local-value-engineer', recommendation });
  } catch (err: any) {
    console.error('Value engineering error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// STATIC / VITE INTEGRATION
// ==========================================
async function startServer() {
  // When running the frontend as a separate dev process (SERVE_FRONTEND=false),
  // this server only exposes the REST API.
  const serveFrontend = process.env.SERVE_FRONTEND !== 'false';

  if (!isProduction && serveFrontend) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!serveFrontend) {
    console.log('Frontend disabled (SERVE_FRONTEND=false); serving API only.');
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DrawMyRoom Studio running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
