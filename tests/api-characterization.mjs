/**
 * API characterization harness for DrawMyRoom.
 *
 * Purpose: regression protection for the Express API contract (routes, status
 * codes, response shapes, merge semantics). It never touches the real data/
 * folder: every run boots the backend with cwd set to a throwaway temp dir
 * seeded from tests/fixtures/data.
 *
 * Usage:
 *   node tests/api-characterization.mjs --out    tests/fixtures/api-baseline.json   (capture)
 *   node tests/api-characterization.mjs --compare tests/fixtures/api-baseline.json  (verify)
 *
 * No external dependencies: plain Node (>= 18 for global fetch), the project's
 * own tsx install runs server.ts.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE_DATA = path.join(PROJECT_ROOT, 'tests', 'fixtures', 'data');
const TSX_CLI = path.join(PROJECT_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const SERVER_TS = path.join(PROJECT_ROOT, 'server.ts');
const PORT = Number(process.env.CHAR_PORT || 3999);
const BASE = `http://127.0.0.1:${PORT}`;

// ---------- CLI args ----------
const args = process.argv.slice(2);
function argValue(name) {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : null;
}
const outPath = argValue('--out');
const comparePath = argValue('--compare');
if (!outPath && !comparePath) {
  console.error('Usage: node tests/api-characterization.mjs --out <file> | --compare <file>');
  process.exit(2);
}

// ---------- Volatile-value normalization ----------
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const ID_RE = /^(proj|user|design|inq|obj|lum|stg)_[0-9]+$/;
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string') {
        if (ISO_RE.test(v)) { out[k] = '<TS>'; continue; }
        if (ID_RE.test(v)) { out[k] = '<ID>'; continue; }
      }
      out[k] = normalize(v);
    }
    return out;
  }
  return value;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]));
  }
  return false;
}
function firstDiff(a, b, where = '$') {
  if (a === b) return null;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${where}: array length ${a.length} != ${b.length}`;
    for (let i = 0; i < a.length; i++) {
      const d = firstDiff(a[i], b[i], `${where}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) {
      return `${where}: keys [${ka}] != [${kb}]`;
    }
    for (const k of ka) {
      const d = firstDiff(a[k], b[k], `${where}.${k}`);
      if (d) return d;
    }
    return null;
  }
  return `${where}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`;
}

// ---------- HTTP helper ----------
async function call(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  return { status: res.status, body: json };
}

// ---------- The route matrix (order matters for write flows) ----------
const STEPS = [
  { name: 'GET /api/projects', expect: 200, run: () => call('GET', '/api/projects') },
  { name: 'GET /api/projects/proj_default_loft', expect: 200, run: () => call('GET', '/api/projects/proj_default_loft') },
  { name: 'GET /api/projects/missing -> 404', expect: 404, run: () => call('GET', '/api/projects/does-not-exist') },
  { name: 'GET /api/auth/me', expect: 200, run: () => call('GET', '/api/auth/me') },
  {
    name: 'POST /api/auth/login (existing user)',
    expect: 200,
    run: () => call('POST', '/api/auth/login', { email: 'ahananmondal2005m@gmail.com', password: 'x' }),
  },
  {
    name: 'POST /api/auth/login (new user auto-creates)',
    expect: 200,
    run: () => call('POST', '/api/auth/login', { email: 'char-user@example.com', password: 'x' }),
  },
  {
    name: 'POST /api/auth/register',
    expect: 200,
    run: () => call('POST', '/api/auth/register', { name: 'Char User', email: 'char-reg@example.com', studioName: 'Char Studio' }),
  },
  {
    name: 'POST /api/projects (client id + partial body)',
    expect: 201,
    run: () =>
      call('POST', '/api/projects', {
        id: 'proj_char_1',
        name: 'Char Test Room',
        roomType: 'Home Office',
        dimensions: { lengthFt: 12, widthFt: 10, ceilingHeightFt: 9, unit: 'ft' },
        budget: { totalCap: 5000, committed: 0, currency: 'USD' },
        placedObjects: [],
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
  },
  { name: 'GET /api/projects/proj_char_1', expect: 200, run: () => call('GET', '/api/projects/proj_char_1') },
  {
    name: 'PUT /api/projects/proj_char_1 (merge)',
    expect: 200,
    run: () => call('PUT', '/api/projects/proj_char_1', { name: 'Char Test Room Renamed', roomType: 'Primary Bedroom' }),
  },
  { name: 'PUT /api/projects/missing -> 404', expect: 404, run: () => call('PUT', '/api/projects/does-not-exist', { name: 'x' }) },
  { name: 'GET /api/designs/proj_default_loft', expect: 200, run: () => call('GET', '/api/designs/proj_default_loft') },
  {
    name: 'POST /api/designs',
    expect: 201,
    run: () =>
      call('POST', '/api/designs', {
        projectId: 'proj_default_loft',
        name: 'Char Snapshot',
        style: 'Japandi Warm',
        totalCost: 1919,
        piecesCount: 2,
        snapshotData: {
          dimensions: { lengthFt: 18, widthFt: 14, ceilingHeightFt: 10, unit: 'ft' },
          placedObjects: [],
          materials: [],
          lightingConfig: {},
        },
      }),
  },
  { name: 'GET /api/designs/proj_default_loft (after save)', expect: 200, run: () => call('GET', '/api/designs/proj_default_loft') },
  {
    name: 'DELETE /api/designs/:id',
    expect: 200,
    run: async () => {
      const list = await call('GET', '/api/designs/proj_default_loft');
      const id = list.body[0].id;
      return call('DELETE', `/api/designs/${id}`);
    },
  },
  { name: 'DELETE /api/projects/proj_char_1', expect: 200, run: () => call('DELETE', '/api/projects/proj_char_1') },
  { name: 'GET /api/projects/proj_char_1 -> 404', expect: 404, run: () => call('GET', '/api/projects/proj_char_1') },
  {
    name: 'POST /api/inquiries',
    expect: 201,
    run: () => call('POST', '/api/inquiries', { name: 'Char User', email: 'char@example.com', designerId: 'des_priya_sharma', message: 'hello' }),
  },
  {
    name: 'POST /api/layout/analyze-sketch',
    expect: 200,
    run: () => call('POST', '/api/layout/analyze-sketch', { manualDimensions: { lengthFt: 18, widthFt: 14, ceilingHeightFt: 10 } }),
  },
  {
    name: 'POST /api/layout/stage-room (Living Room / $2200 / Japandi Warm)',
    expect: 200,
    run: () =>
      call('POST', '/api/layout/stage-room', {
        roomType: 'Living Room',
        dimensions: { lengthFt: 18, widthFt: 14, ceilingHeightFt: 10 },
        budgetCap: 2200,
        stylePreference: 'Japandi Warm',
      }),
  },
  {
    name: 'POST /api/layout/stage-room (tiny 8x6 degrades gracefully)',
    expect: 200,
    run: () => call('POST', '/api/layout/stage-room', { roomType: 'Living Room', dimensions: { lengthFt: 8, widthFt: 6, ceilingHeightFt: 9 }, budgetCap: 5000 }),
  },
  {
    name: 'POST /api/layout/balance-lighting',
    expect: 200,
    run: () =>
      call('POST', '/api/layout/balance-lighting', {
        timeOfDay: '21:30',
        targetLumens: 3800,
        currentFixtures: [
          { name: 'Architectural Linear Cove', lumens: 1200, cct: '2700K' },
          { name: 'Flos Style Brass Arc', lumens: 800, cct: '3000K' },
          { name: 'Flush Gimbal Cans (3x)', lumens: 600, cct: '4000K' },
        ],
        roomSqFt: 252,
      }),
  },
  {
    name: 'POST /api/layout/value-engineer',
    expect: 200,
    run: () =>
      call('POST', '/api/layout/value-engineer', {
        items: [{ id: 'obj_1', name: 'Noguchi Rudder Coffee Table', category: 'Tables & Desks', modelType: 'table', price: 760, dimensions: { lengthIn: 48, widthIn: 24 }, leadTime: '5-7 business days' }],
        currentTotal: 760,
        budgetCap: 2200,
      }),
  },
  { name: 'POST /api/gemini/stage-room -> 404 (removed route)', expect: 404, run: () => call('POST', '/api/gemini/stage-room', {}) },
];

// ---------- Boot the server in an isolated temp cwd ----------
if (!fs.existsSync(TSX_CLI)) {
  console.error(`FATAL: tsx not found at ${TSX_CLI}. Run npm install first.`);
  process.exit(2);
}
if (!fs.existsSync(FIXTURE_DATA)) {
  console.error(`FATAL: fixture data not found at ${FIXTURE_DATA}. Create it by copying data/ once.`);
  process.exit(2);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dmr-char-'));
fs.cpSync(FIXTURE_DATA, path.join(tempDir, 'data'), { recursive: true });

const child = spawn(process.execPath, [TSX_CLI, SERVER_TS], {
  cwd: tempDir,
  env: { ...process.env, PORT: String(PORT), SERVE_FRONTEND: 'false' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let serverLog = '';
child.stdout.on('data', (d) => (serverLog += d));
child.stderr.on('data', (d) => (serverLog += d));
let childExited = false;
child.on('exit', () => { childExited = true; });

async function waitForServer(ms = 60000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (childExited) throw new Error(`server process exited early\n${serverLog}`);
    try {
      const res = await fetch(`${BASE}/api/projects`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not start within ${ms}ms\n${serverLog}`);
}

async function shutdown() {
  child.kill();
  const deadline = Date.now() + 5000;
  while (child.exitCode === null && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 200));
  }
  if (child.exitCode === null) child.kill('SIGKILL');
  try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* best effort */ }
}

// ---------- Main ----------
let failures = 0;
try {
  await waitForServer();
  const results = [];
  for (const step of STEPS) {
    let res;
    try {
      res = await step.run();
    } catch (err) {
      failures++;
      results.push({ name: step.name, error: String(err) });
      console.log(`FAIL ${step.name}: request threw ${err}`);
      continue;
    }
    const statusOk = res.status === step.expect;
    if (!statusOk) failures++;
    results.push({ name: step.name, status: res.status, expected: step.expect, body: normalize(res.body) });
    console.log(`${statusOk ? 'ok  ' : 'FAIL'} ${step.name} -> ${res.status}${statusOk ? '' : ` (expected ${step.expect})`}`);
  }

  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`\nBaseline captured: ${outPath} (${results.length} steps, ${failures} unexpected statuses)`);
  } else if (comparePath) {
    const baseline = JSON.parse(fs.readFileSync(comparePath, 'utf-8'));
    let mismatches = 0;
    if (baseline.length !== results.length) {
      mismatches++;
      console.log(`DIFF step count: baseline ${baseline.length} vs actual ${results.length}`);
    }
    for (let i = 0; i < Math.min(baseline.length, results.length); i++) {
      const b = baseline[i], a = results[i];
      if (b.name !== a.name) {
        mismatches++;
        console.log(`DIFF step ${i}: name "${b.name}" vs "${a.name}"`);
        continue;
      }
      if (b.status !== a.status || b.expected !== a.expected) {
        mismatches++;
        console.log(`DIFF ${b.name}: status ${b.status}/${b.expected} vs ${a.status}/${a.expected}`);
        continue;
      }
      if (!deepEqual(b.body, a.body)) {
        mismatches++;
        console.log(`DIFF ${b.name}: ${firstDiff(b.body, a.body)}`);
      }
    }
    if (mismatches === 0 && failures === 0) {
      console.log(`\nCOMPARE OK: ${results.length} steps match the baseline exactly.`);
    } else {
      console.log(`\nCOMPARE FAILED: ${mismatches} structural difference(s), ${failures} unexpected status code(s).`);
      failures += mismatches;
    }
  }
} catch (err) {
  console.error(String(err));
  failures++;
} finally {
  await shutdown();
}

process.exit(failures === 0 ? 0 : 1);
