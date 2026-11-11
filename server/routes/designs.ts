import { Router, Request, Response } from 'express';
import { readData, writeData } from '../store';

/**
 * Saved design variation routes (mounted at /api/designs).
 *
 * Preserves the original semantics from server.ts: designs are stored
 * newest-first; DELETE is idempotent. (Note: the current frontend does not
 * call these routes — SavedDesignsView keeps variations in component state —
 * but the public API contract is preserved for compatibility.)
 */

const router = Router();

interface StoredDesign {
  id: string;
  projectId: string;
  [key: string]: unknown;
}

router.get('/:projectId', (req: Request, res: Response) => {
  const designs = readData<StoredDesign[]>('designs.json', []);
  const filtered = designs.filter((d) => d.projectId === req.params.projectId);
  res.json(filtered);
});

router.post('/', (req: Request, res: Response) => {
  const designs = readData<StoredDesign[]>('designs.json', []);
  const newDesign: StoredDesign = {
    id: `design_${Date.now()}`,
    ...req.body,
    timestamp: new Date().toISOString(),
  };
  designs.unshift(newDesign);
  writeData('designs.json', designs);
  res.status(201).json(newDesign);
});

router.delete('/:id', (req: Request, res: Response) => {
  let designs = readData<StoredDesign[]>('designs.json', []);
  designs = designs.filter((d) => d.id !== req.params.id);
  writeData('designs.json', designs);
  res.json({ success: true });
});

export const designsRouter = router;
