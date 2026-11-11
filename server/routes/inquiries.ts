import { Router, Request, Response } from 'express';
import { readData, writeData } from '../store';

/**
 * Designer inquiry routes (mounted at /api/inquiries).
 * Persists contact / designer-connect submissions to inquiries.json.
 */

const router = Router();

interface StoredInquiry {
  id: string;
  [key: string]: unknown;
}

router.post('/', (req: Request, res: Response) => {
  const inquiries = readData<StoredInquiry[]>('inquiries.json', []);
  const newInquiry: StoredInquiry = {
    id: `inq_${Date.now()}`,
    ...req.body,
    createdAt: new Date().toISOString(),
  };
  inquiries.unshift(newInquiry);
  writeData('inquiries.json', inquiries);
  res.status(201).json({ success: true, inquiry: newInquiry });
});

export const inquiriesRouter = router;
