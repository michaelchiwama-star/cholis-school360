import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { config } from '../config';
import {
  verifyPassword, issueToken, requireAuth, AuthedRequest,
  loginBlocked, recordLoginFailure, clearLoginFailures,
} from '../security';

const router = Router();

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  const ip = req.ip ?? 'unknown';
  if (loginBlocked(ip)) {
    return res.status(429).json({ error: 'Too many failed sign-in attempts. Please wait 15 minutes and try again.' });
  }

  const { username, password } = req.body as { username: string; password: string };
  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const db = getDb();
  const user = db.prepare_get<any>(`
    SELECT u.id, u.school_id, u.name, u.role, u.position, u.username, u.password, s.name as school_name
    FROM users u
    JOIN schools s ON s.id = u.school_id
    WHERE u.username = ?
  `, [username.trim()]);

  if (!user || !verifyPassword(password, user.password)) {
    recordLoginFailure(ip);
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  clearLoginFailures(ip);

  return res.json({
    id: user.id,
    school_id: user.school_id,
    school_name: user.school_name,
    name: user.name,
    role: user.role,
    position: user.position ?? null,
    username: user.username,
    token: issueToken(user.id),
  });
});

// GET /api/auth/me — confirms a saved session is still valid
router.get('/me', requireAuth, (req: Request, res: Response) => {
  const r = req as AuthedRequest;
  const school = getDb().prepare_get<any>('SELECT name FROM schools WHERE id = ?', [r.schoolId]);
  const me = getDb().prepare_get<any>('SELECT position FROM users WHERE id = ?', [r.userId]);
  return res.json({ id: r.userId, school_id: r.schoolId, school_name: school?.name ?? '', name: r.userName, role: r.role, position: me?.position ?? null });
});

// GET /api/auth/demo-accounts
// The password is only included when running locally with the default
// password. Online, people you invite are given the password separately.
router.get('/demo-accounts', (_req: Request, res: Response) => {
  const pw = config.showDemoPassword ? config.demoPassword : undefined;
  res.json([
    { label: 'Teacher — Ms. Beatrice Mulenga', username: 'teacher1', password: pw, role: 'teacher' },
    { label: 'Teacher — Ms. Gracious Singogo', username: 'teacher2', password: pw, role: 'teacher' },
    { label: 'School Counsellor — Ms. Mercy Mwakibinga', username: 'professional1', password: pw, role: 'professional' },
    { label: 'Learner Support Coordinator — Ms. Changu Mbozi', username: 'support1', password: pw, role: 'professional' },
    { label: 'Head Teacher — Mrs. Josephine Zulu', username: 'leader1', password: pw, role: 'leader' },
    { label: 'CHOLIS Administrator — Ms. Chola Mwewa', username: 'admin1', password: pw, role: 'admin' },
  ]);
});

export default router;
