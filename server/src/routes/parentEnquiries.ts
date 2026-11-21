import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { requireAuth, AuthedRequest } from '../security';

// Parent and guardian enquiries from the public Parent Resource Hub.
// A parent chooses who should respond:
//   'school' — their child's school's Counselling and Learner Support Department (the default)
//   'cholis' — CHOLIS (also used when the child's school is not on School360)
// Enquiries sent to a school are visible only to that school's department; CHOLIS
// sees that they exist (school, topic, status) but not the message or contact details.

export const PARENT_TOPICS = [
  'Supporting learning at home',
  'Behaviour at home or school',
  'Emotional wellbeing',
  'Friendships and peer relationships',
  'Attendance',
  "Talking with my child's teacher",
  'Teenage development',
  'Other',
];
export const PARENT_STATUSES = ['New', 'Contacted', 'Closed'];

const router = Router();
router.use(requireAuth);

const BASE = `
  SELECT pi.*, s.name as school_name, h.name as handled_by_name
  FROM parent_inquiries pi
  LEFT JOIN schools s ON s.id = pi.school_id
  LEFT JOIN users h ON h.id = pi.handled_by_id`;

function mask(row: any) {
  return { ...row, message: null, contact_name: null, contact_phone: null, contact_email: null, masked: true };
}

// GET /api/parent-enquiries
router.get('/', (req: Request, res: Response) => {
  const { role, schoolId } = req as AuthedRequest;
  const db = getDb();
  if (role === 'professional') {
    return res.json(db.prepare_all(`${BASE} WHERE pi.route_to = 'school' AND pi.school_id = ? ORDER BY pi.submitted_at DESC`, [schoolId]));
  }
  if (role === 'admin' || role === 'cholis') {
    const rows = db.prepare_all<any>(`${BASE} ORDER BY pi.submitted_at DESC`);
    return res.json(rows.map(r => (r.route_to === 'school' ? mask(r) : r)));
  }
  return res.status(403).json({ error: 'Access denied.' });
});

// PATCH /api/parent-enquiries/:id  { status }
router.patch('/:id', (req: Request, res: Response) => {
  const { role, schoolId, userId } = req as AuthedRequest;
  const { status } = req.body as { status?: string };
  if (!status || !PARENT_STATUSES.includes(status)) return res.status(400).json({ error: 'Please choose a valid status.' });
  const db = getDb();
  const row = db.prepare_get<any>('SELECT * FROM parent_inquiries WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ error: 'Enquiry not found.' });
  const allowed =
    (role === 'professional' && row.route_to === 'school' && row.school_id === schoolId) ||
    ((role === 'admin' || role === 'cholis') && row.route_to !== 'school');
  if (!allowed) return res.status(403).json({ error: 'Access denied.' });
  db.prepare_run('UPDATE parent_inquiries SET status = ?, handled_by_id = ?, updated_at = ? WHERE id = ?',
    [status, userId, new Date().toISOString(), row.id]);
  db.save();
  return res.json({ ok: true });
});

export default router;
