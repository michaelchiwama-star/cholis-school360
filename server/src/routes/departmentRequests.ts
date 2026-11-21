import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthedRequest, tooLong } from '../security';
import { notifyUsers, cholisStaffIds, emailCholis, schoolName } from '../notify';

// Requests from a school's Counselling and Learner Support Department to CHOLIS
// for department-level support (training, supervision, materials and so on).
// These are not about an individual learner, and must not contain learner details.

export const DEPARTMENT_TOPICS = [
  'Staff training or CPD',
  'Supervision or case consultation (no learner names)',
  'Classroom observation or coaching',
  'Ubuntu programme materials',
  'Department setup or policy support',
  'Staff wellbeing support',
  'Feedback about CHOLIS services',
  'Other',
];
const URGENCY = ['Routine', 'Soon (within 2 weeks)'];
const STATUSES = ['New', 'In progress', 'Completed'];

const router = Router();
router.use(requireAuth);

// GET /api/department-requests
router.get('/', (req: Request, res: Response) => {
  const { role, schoolId } = req as AuthedRequest;
  const db = getDb();
  const base = `
    SELECT dr.*, u.name as requester_name, u.position as requester_position, s.name as school_name
    FROM department_requests dr
    JOIN users u ON u.id = dr.requester_id
    JOIN schools s ON s.id = dr.school_id`;
  if (role === 'professional') {
    return res.json(db.prepare_all(`${base} WHERE dr.school_id = ? ORDER BY dr.created_at DESC`, [schoolId]));
  }
  if (role === 'admin' || role === 'cholis') {
    return res.json(db.prepare_all(`${base} ORDER BY dr.created_at DESC`));
  }
  return res.status(403).json({ error: 'Access denied.' });
});

// GET /api/department-requests/options
router.get('/options', (_req: Request, res: Response) => {
  res.json({ topics: DEPARTMENT_TOPICS, urgency: URGENCY, statuses: STATUSES });
});

// POST /api/department-requests  (department staff only)
router.post('/', (req: Request, res: Response) => {
  const { role, schoolId, userId } = req as AuthedRequest;
  if (role !== 'professional') {
    return res.status(403).json({ error: 'Only Counselling and Learner Support Department staff can request CHOLIS support.' });
  }
  const { topic, summary, details, preferred_timing, urgency } = req.body as {
    topic: string; summary: string; details: string; preferred_timing?: string; urgency?: string;
  };
  if (!topic || !summary?.trim() || !details?.trim()) {
    return res.status(400).json({ error: 'Please choose a topic and fill in the summary and details.' });
  }
  if (!DEPARTMENT_TOPICS.includes(topic)) return res.status(400).json({ error: 'Please choose a topic from the list.' });
  const urg = urgency && URGENCY.includes(urgency) ? urgency : 'Routine';
  const lengthError = tooLong(req.body, { summary: 120, details: 1500, preferred_timing: 100 });
  if (lengthError) return res.status(400).json({ error: lengthError });

  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare_run(`
    INSERT INTO department_requests (id,school_id,requester_id,topic,summary,details,preferred_timing,urgency,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `, [id, schoolId, userId, topic, summary.trim(), details.trim(), preferred_timing?.trim() || null, urg, 'New', now, now]);
  const school = schoolName(schoolId);
  notifyUsers(cholisStaffIds(), {
    kind: 'department_request', refId: id, schoolId,
    title: `New department request from ${school}`,
    body: `${topic} · ${summary.trim()}${urg !== 'Routine' ? ` · ${urg}` : ''}`,
  });
  void emailCholis(`School360: new department request from ${school}`,
    `${school}'s Counselling and Learner Support Department has requested: ${topic}${urg !== 'Routine' ? ` (${urg})` : ''}.`);
  db.save();
  return res.status(201).json({ id });
});

export default router;
