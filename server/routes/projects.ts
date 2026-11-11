import { Router, Request, Response } from 'express';
import { readData, writeData } from '../store';
import { DEFAULT_PROJECT } from '../../src/data/seed';
import { Project } from '../../src/types';

/**
 * Project CRUD routes (mounted at /api/projects).
 *
 * Preserves the original semantics from server.ts:
 * - POST preserves a client-supplied id so subsequent PUT/DELETE calls target
 *   the same record; missing fields are merged over the default project seed.
 * - PUT merges the body over the stored record and stamps updatedAt.
 * - DELETE is idempotent (200 even if the id is unknown).
 */

const router = Router();

// Initialize projects database if empty
const initialProjects = readData<Project[]>('projects.json', [DEFAULT_PROJECT]);
if (!initialProjects.length) {
  writeData('projects.json', initialProjects);
}

router.get('/', (_req: Request, res: Response) => {
  const projects = readData<Project[]>('projects.json', [DEFAULT_PROJECT]);
  res.json(projects);
});

router.get('/:id', (req: Request, res: Response) => {
  const projects = readData<Project[]>('projects.json', [DEFAULT_PROJECT]);
  const proj = projects.find((p) => p.id === req.params.id);
  if (!proj) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(proj);
});

router.post('/', (req: Request, res: Response) => {
  const projects = readData<Project[]>('projects.json', [DEFAULT_PROJECT]);
  // Preserve the client-provided id so subsequent PUT/DELETE calls target the same record.
  const newProject: Project = {
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

router.put('/:id', (req: Request, res: Response) => {
  const projects = readData<Project[]>('projects.json', [DEFAULT_PROJECT]);
  const index = projects.findIndex((p) => p.id === req.params.id);
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

router.delete('/:id', (req: Request, res: Response) => {
  let projects = readData<Project[]>('projects.json', [DEFAULT_PROJECT]);
  projects = projects.filter((p) => p.id !== req.params.id);
  writeData('projects.json', projects);
  res.json({ success: true });
});

export const projectsRouter = router;
