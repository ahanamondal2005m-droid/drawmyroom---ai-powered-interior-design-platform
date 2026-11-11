import { RoomDimensions, LuminaireFixture, Project } from '../types';

/**
 * Central HTTP client for the DrawMyRoom backend (Express, /api/*).
 *
 * Semantics mirror the original inline fetch() calls exactly:
 * - Parsed-JSON helpers reject only on network/parse failures; they do NOT
 *   check res.ok — callers validate response payloads the same way as before
 *   (e.g. `data.success && data.stagingPlan`).
 * - Fire-and-forget mutations (project create/update/delete) return the raw
 *   Response promise so callers keep their original .catch handling.
 * - sendInquiry returns the raw Response because its caller checks res.ok.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// ---------- Reads (parsed JSON) ----------

export function listProjects(): Promise<any> {
  return fetch('/api/projects').then((res) => res.json());
}

export function getCurrentUser(): Promise<any> {
  return fetch('/api/auth/me').then((res) => res.json());
}

// ---------- Auth (parsed JSON) ----------

export function login(payload: { email: string; password: string }): Promise<any> {
  return fetch('/api/auth/login', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  }).then((res) => res.json());
}

export function register(payload: {
  email: string;
  name: string;
  studioName: string;
  password: string;
  preferredCurrency: string;
}): Promise<any> {
  return fetch('/api/auth/register', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  }).then((res) => res.json());
}

// ---------- Project CRUD (raw Response; callers fire-and-forget with .catch) ----------

export function createProject(project: Project): Promise<Response> {
  return fetch('/api/projects', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(project),
  });
}

export function updateProject(id: string, project: Project): Promise<Response> {
  return fetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(project),
  });
}

export function deleteProject(id: string): Promise<Response> {
  return fetch(`/api/projects/${id}`, { method: 'DELETE' });
}

// ---------- Local layout engine (parsed JSON) ----------

export function analyzeSketch(payload: {
  imageBase64: string;
  mimeType: string;
  manualDimensions: RoomDimensions;
}): Promise<any> {
  return fetch('/api/layout/analyze-sketch', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  }).then((res) => res.json());
}

export function stageRoom(payload: {
  roomType: string;
  dimensions: RoomDimensions;
  budgetCap: number;
  stylePreference: string;
}): Promise<any> {
  return fetch('/api/layout/stage-room', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  }).then((res) => res.json());
}

export function balanceLighting(payload: {
  timeOfDay: string;
  targetLumens: number;
  currentFixtures: LuminaireFixture[];
  roomSqFt: number;
}): Promise<any> {
  return fetch('/api/layout/balance-lighting', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  }).then((res) => res.json());
}

// ---------- Designer inquiries (raw Response; caller checks res.ok) ----------

export function sendInquiry(payload: {
  designerId: string;
  designerName: string;
  clientName: string;
  clientEmail: string;
  projectName: string;
  roomType: string;
  dimensions: RoomDimensions;
  budgetCap: number;
  notes: string;
}): Promise<Response> {
  return fetch('/api/inquiries', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
}
