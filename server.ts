import express, { Request, Response } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { authRouter } from './server/routes/auth';
import { projectsRouter } from './server/routes/projects';
import { designsRouter } from './server/routes/designs';
import { inquiriesRouter } from './server/routes/inquiries';
import { layoutRouter } from './server/routes/layout';

/**
 * DrawMyRoom backend entry point.
 *
 * HTTP concerns live in server/routes/*, JSON-file persistence in
 * server/store.ts, and the canonical seed data in src/data/seed.ts (shared
 * with the frontend). All planning intelligence runs locally via
 * local-engine/ — no network calls, no API keys.
 *
 * Run modes:
 * - `npm run dev`        — combined mode: serves the Vite frontend and the
 *                          API together on PORT (default 3000).
 * - SERVE_FRONTEND=false — API-only mode for the split dev setup (frontend
 *                          runs separately on Vite's own port).
 */

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsers with large limits for sketch uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==========================================
// REST API ROUTES
// ==========================================

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/designs', designsRouter);
app.use('/api/inquiries', inquiriesRouter);
app.use('/api/layout', layoutRouter);

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
