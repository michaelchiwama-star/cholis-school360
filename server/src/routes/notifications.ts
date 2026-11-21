import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { requireAuth, AuthedRequest } from '../security';

const router = Router();
router.use(requireAuth);

// GET /api/notifications — my latest notifications and how many are unread
router.get('/', (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;
  const db = getDb();
  const items = db.prepare_all(
    `SELECT n.*, s.name as school_name FROM notifications n LEFT JOIN schools s ON s.id = n.school_id
     WHERE n.user_id = ? ORDER BY n.created_at DESC LIMIT 30`, [userId]
  );
  const unread = db.prepare_get<any>(`SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read_at IS NULL`, [userId])?.c ?? 0;
  res.json({ unread, items });
});

// POST /api/notifications/read-all
router.post('/read-all', (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;
  const db = getDb();
  db.prepare_run(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`, [new Date().toISOString(), userId]);
  db.save();
  res.json({ ok: true });
});

// POST /api/notifications/:id/read
router.post('/:id/read', (req: Request, res: Response) => {
  const { userId } = req as AuthedRequest;
  const db = getDb();
  db.prepare_run(`UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ? AND read_at IS NULL`, [new Date().toISOString(), req.params.id, userId]);
  db.save();
  res.json({ ok: true });
});

export default router;
