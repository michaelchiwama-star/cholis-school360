import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { config } from './config';
import { getDb } from './db';

/* ── Passwords ─────────────────────────────────────────────
   Passwords are stored as salted scrypt hashes, never as plain text. */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hash] = parts;
  const candidate = crypto.scryptSync(password, salt, 32);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && crypto.timingSafeEqual(candidate, expected);
}

/* ── Session tokens ────────────────────────────────────────
   After login the server issues a signed token. The server — not the
   browser — decides who the user is, their role and their school, by
   checking the signature and looking the user up in the database. */

function sign(payload: string): string {
  return crypto.createHmac('sha256', config.sessionSecret).update(payload).digest('base64url');
}

export function issueToken(userId: string): string {
  const expires = Date.now() + config.sessionHours * 3600_000;
  const payload = `${userId}.${expires}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

export function readToken(token: string): string | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  let payload: string;
  try { payload = Buffer.from(encoded, 'base64url').toString('utf8'); } catch { return null; }
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const lastDot = payload.lastIndexOf('.');
  const userId = payload.slice(0, lastDot);
  const expires = Number(payload.slice(lastDot + 1));
  if (!userId || !Number.isFinite(expires) || Date.now() > expires) return null;
  return userId;
}

export interface AuthedRequest extends Request {
  userId: string;
  schoolId: string;
  role: 'teacher' | 'professional' | 'leader' | 'admin' | 'cholis';
  userName: string;
}

/** Rejects any request without a valid session; attaches the verified user. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = token ? readToken(token) : null;
  if (!userId) {
    return res.status(401).json({ error: 'Please sign in again.' });
  }
  const user = getDb().prepare_get<any>('SELECT id, school_id, role, name FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.status(401).json({ error: 'Please sign in again.' });
  }
  const r = req as AuthedRequest;
  r.userId = user.id;
  r.schoolId = user.school_id;
  r.role = user.role;
  r.userName = user.name;
  return next();
}

/* ── Login attempt limit ───────────────────────────────────
   Slows down password guessing: 10 failed attempts per address
   per 15 minutes. */

const failures = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_FAILURES = 10;

export function loginBlocked(ip: string): boolean {
  const entry = failures.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) { failures.delete(ip); return false; }
  return entry.count >= MAX_FAILURES;
}

export function recordLoginFailure(ip: string) {
  const now = Date.now();
  const entry = failures.get(ip);
  if (!entry || now > entry.resetAt) failures.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  else entry.count += 1;
}

export function clearLoginFailures(ip: string) {
  failures.delete(ip);
}

/* ── Input length limits ─────────────────────────────────── */

export function tooLong(fields: Record<string, unknown>, limits: Record<string, number>): string | null {
  for (const [key, max] of Object.entries(limits)) {
    const v = fields[key];
    if (typeof v === 'string' && v.length > max) return `${key.replace(/_/g, ' ')} is too long (maximum ${max} characters).`;
  }
  return null;
}
