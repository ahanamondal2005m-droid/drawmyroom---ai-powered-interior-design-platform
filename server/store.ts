import fs from 'fs';
import path from 'path';

/**
 * JSON-file persistence for the DrawMyRoom backend.
 *
 * Data lives in `<cwd>/data/*.json`. Reads/writes are synchronous and
 * last-write-wins (single-process, dev-oriented store — unchanged from the
 * original implementation in server.ts).
 */

const DATA_DIR = path.resolve(process.cwd(), 'data');

// Ensure the persistence directory exists (was done at server startup before;
// kept as an import-time side effect so behavior is identical).
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readData<T>(fileName: string, defaultVal: T): T {
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

export function writeData<T>(fileName: string, data: T): void {
  const filePath = path.join(DATA_DIR, fileName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${fileName}:`, err);
  }
}
