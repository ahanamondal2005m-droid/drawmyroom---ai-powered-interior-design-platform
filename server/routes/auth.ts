import { Router, Request, Response } from 'express';
import { readData, writeData } from '../store';
import { DEFAULT_USER } from '../../src/data/seed';
import { UserProfile } from '../../src/types';

/**
 * Auth routes (mounted at /api/auth).
 *
 * Preserves the original semantics from server.ts:
 * - Login auto-creates the user when the email is unknown.
 * - `initialUsers` is the users.json snapshot read at process start; it is
 *   reused as the readData fallback if the file disappears mid-run.
 * - /api/auth/me always returns the first stored user.
 */

const router = Router();

// Initialize users database if empty
const initialUsers = readData<UserProfile[]>('users.json', [DEFAULT_USER]);
if (!initialUsers.length) {
  writeData('users.json', initialUsers);
}

router.post('/login', (req: Request, res: Response) => {
  const { email } = req.body;
  const users = readData<UserProfile[]>('users.json', initialUsers);
  let user = users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
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

router.post('/register', (req: Request, res: Response) => {
  const { name, email, studioName, preferredCurrency } = req.body;
  const users = readData<UserProfile[]>('users.json', initialUsers);
  const newUser: UserProfile = {
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

router.get('/me', (_req: Request, res: Response) => {
  const users = readData<UserProfile[]>('users.json', initialUsers);
  res.json({ user: users[0] || null });
});

export const authRouter = router;
