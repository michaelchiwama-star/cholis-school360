import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthedRequest, tooLong } from '../security';
import { DEPARTMENT_ROLES, isDepartmentRole, schoolRouting } from '../routing';
import { notifyUsers, cholisStaffIds, emailCholis, schoolName } from '../notify';

const router = Router();

const CATEGORIES = [
  'Learning difficulties', 'Classroom behaviour', 'Emotional wellbeing',
  'Peer relationships', 'Attendance', 'Inclusive education support', 'Other',
];

// All routes here need a verified session. Role and school come from the
// server-side session, never from what the browser claims.
router.use(requireAuth);

// GET /api/requests/routing
// Who receives each kind of request at this school, and the department staff.
router.get('/routing', (req: Request, res: Response) => {
  const { schoolId } = req as AuthedRequest;
  const db = getDb();
  const school = db.prepare_get<any>('SELECT routing FROM schools WHERE id = ?', [schoolId]);
  const staff = db.prepare_all<any>(
    `SELECT name, position FROM users WHERE school_id = ? AND role = 'professional' ORDER BY position`, [schoolId]
  );
  return res.json({ routing: schoolRouting(school?.routing), roles: DEPARTMENT_ROLES, staff });
});

// GET /api/requests
router.get('/', (req: Request, res: Response) => {
  const db = getDb();
  const { role, schoolId, userId } = req as AuthedRequest;

  let rows: any[];
  if (role === 'teacher') {
    rows = db.prepare_all(`
      SELECT sr.*, u.name as teacher_name, a.name as assigned_name
      FROM support_requests sr
      JOIN users u ON u.id = sr.teacher_id
      LEFT JOIN users a ON a.id = sr.assigned_to
      WHERE sr.school_id = ? AND sr.teacher_id = ?
      ORDER BY sr.submitted_at DESC
    `, [schoolId, userId]);
  } else {
    rows = db.prepare_all(`
      SELECT sr.*, u.name as teacher_name, a.name as assigned_name, c.name as cholis_assignee_name
      FROM support_requests sr
      JOIN users u ON u.id = sr.teacher_id
      LEFT JOIN users a ON a.id = sr.assigned_to
      LEFT JOIN users c ON c.id = sr.cholis_assignee_id
      WHERE sr.school_id = ?
      ORDER BY sr.submitted_at DESC
    `, [schoolId]);
  }

  if (role === 'teacher') {
    // Teachers see their own requests, not the department's notes to CHOLIS.
    return res.json(rows.map(({ cholis_note, cholis_response, cholis_assignee_id, cholis_status, cholis_requested_at, ...r }) => r));
  }
  if (role === 'leader' || role === 'admin' || role === 'cholis') {
    return res.json(rows.map(r => ({ ...r, observations: '[Restricted — professional access only]' })));
  }
  return res.json(rows);
});

// POST /api/requests
router.post('/', (req: Request, res: Response) => {
  const { role, schoolId, userId } = req as AuthedRequest;
  if (role !== 'teacher') {
    return res.status(403).json({ error: 'Only teachers may submit requests.' });
  }

  const { learner_ref, classroom, category, observations } = req.body as {
    learner_ref: string; classroom: string; category: string; observations: string;
  };
  let routed_to: unknown = req.body?.routed_to;
  if (!learner_ref || !classroom || !category || !observations) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Please choose a support category from the list.' });
  }
  const lengthError = tooLong(req.body, { learner_ref: 40, classroom: 40, observations: 2000 });
  if (lengthError) return res.status(400).json({ error: lengthError });

  const db = getDb();
  if (routed_to === undefined || routed_to === null || routed_to === '') {
    const school = db.prepare_get<any>('SELECT routing FROM schools WHERE id = ?', [schoolId]);
    routed_to = schoolRouting(school?.routing)[category];
  }
  if (!isDepartmentRole(routed_to)) {
    return res.status(400).json({ error: 'Please choose who in your Counselling and Learner Support Department should receive this request.' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare_run(`
    INSERT INTO support_requests (id,school_id,teacher_id,learner_ref,classroom,category,observations,status,routed_to,submitted_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `, [id, schoolId, userId, learner_ref.trim(), classroom.trim(), category, observations.trim(), 'Submitted', routed_to, now, now]);

  db.prepare_run(`
    INSERT INTO request_activities (id,request_id,actor_id,action,note,created_at)
    VALUES (?,?,?,?,?,?)
  `, [uuidv4(), id, userId, `Request submitted to the ${routed_to}`, null, now]);

  db.save();

  const created = db.prepare_get<any>(`
    SELECT sr.*, u.name as teacher_name
    FROM support_requests sr
    JOIN users u ON u.id = sr.teacher_id
    WHERE sr.id = ?
  `, [id]);

  return res.status(201).json(created);
});

// PATCH /api/requests/:id
router.patch('/:id', (req: Request, res: Response) => {
  const { role, schoolId, userId } = req as AuthedRequest;
  if (role !== 'professional' && role !== 'admin') {
    return res.status(403).json({ error: 'Only Counselling and Learner Support Department staff may update requests.' });
  }

  const db = getDb();
  const { status, assigned_to, note, routed_to, request_cholis, cholis_note } = req.body as {
    status?: string; assigned_to?: string | null; note?: string;
    routed_to?: string; request_cholis?: boolean; cholis_note?: string;
  };
  const lengthError = tooLong(req.body, { note: 500, cholis_note: 300 });
  if (lengthError) return res.status(400).json({ error: lengthError });

  const existing = db.prepare_get<any>('SELECT * FROM support_requests WHERE id = ? AND school_id = ?', [req.params.id, schoolId]);
  if (!existing) {
    return res.status(404).json({ error: 'Request not found.' });
  }

  const validStatuses = ['Submitted', 'Under Review', 'Assigned', 'Completed', 'Closed'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status.' });
  }

  // A request can only be assigned to a professional at the same school.
  if (assigned_to) {
    const assignee = db.prepare_get<any>(
      `SELECT id FROM users WHERE id = ? AND school_id = ? AND role = 'professional'`, [assigned_to, schoolId]
    );
    if (!assignee) return res.status(400).json({ error: 'That staff member is not available for this school.' });
  }
  if (routed_to !== undefined && !isDepartmentRole(routed_to)) {
    return res.status(400).json({ error: 'Invalid department role.' });
  }
  if (request_cholis && existing.cholis_requested_at) {
    return res.status(400).json({ error: 'CHOLIS support has already been requested for this learner.' });
  }
  if (request_cholis && !(cholis_note ?? '').trim()) {
    return res.status(400).json({ error: 'Please add a short note telling CHOLIS what support the department needs.' });
  }

  const now = new Date().toISOString();
  const newStatus = status ?? existing.status;
  const newAssigned = assigned_to !== undefined ? assigned_to : existing.assigned_to;
  const newRoute = routed_to ?? existing.routed_to;
  const cholisAt = request_cholis ? now : existing.cholis_requested_at;
  const cholisNote = request_cholis ? (cholis_note ?? '').trim() : existing.cholis_note;

  db.prepare_run(`
    UPDATE support_requests SET status = ?, assigned_to = ?, routed_to = ?, cholis_requested_at = ?, cholis_note = ?, updated_at = ?
    WHERE id = ? AND school_id = ?
  `, [newStatus, newAssigned, newRoute, cholisAt, cholisNote, now, req.params.id, schoolId]);

  let action = '';
  if (status && status !== existing.status) action += `Status changed to ${status}`;
  if (assigned_to !== undefined && assigned_to !== existing.assigned_to) {
    if (action) action += '. ';
    if (assigned_to) {
      const assignedUser = db.prepare_get<any>('SELECT name FROM users WHERE id = ?', [assigned_to]);
      action += `Assigned to ${assignedUser?.name ?? assigned_to}`;
    } else {
      action += 'Assignment removed';
    }
  }
  if (routed_to !== undefined && routed_to !== existing.routed_to) {
    if (action) action += '. ';
    action += `Redirected to the ${routed_to}`;
  }
  if (request_cholis) {
    if (action) action += '. ';
    action += 'Additional support requested from CHOLIS';
  }
  if (!action) action = 'Request updated';

  db.prepare_run(`
    INSERT INTO request_activities (id,request_id,actor_id,action,note,created_at)
    VALUES (?,?,?,?,?,?)
  `, [uuidv4(), req.params.id, userId, action, (request_cholis ? cholisNote : note) ?? null, now]);

  if (request_cholis) {
    const school = schoolName(schoolId);
    notifyUsers(cholisStaffIds(), {
      kind: 'learner_referral', refId: req.params.id, schoolId,
      title: `New learner referral from ${school}`,
      body: `${existing.category} · from the ${newRoute ?? 'Counselling and Learner Support Department'}`,
    });
    void emailCholis(`School360: new learner referral from ${school}`,
      `${school}'s Counselling and Learner Support Department has requested CHOLIS support for a learner (category: ${existing.category}).`);
  }

  db.save();

  const updated = db.prepare_get<any>(`
    SELECT sr.*, u.name as teacher_name, a.name as assigned_name
    FROM support_requests sr
    JOIN users u ON u.id = sr.teacher_id
    LEFT JOIN users a ON a.id = sr.assigned_to
    WHERE sr.id = ?
  `, [req.params.id]);

  return res.json(updated);
});

// GET /api/requests/:id/activities
router.get('/:id/activities', (req: Request, res: Response) => {
  const { role, schoolId } = req as AuthedRequest;
  if (role !== 'professional' && role !== 'admin') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  const db = getDb();
  // Only activity for requests belonging to the user's own school.
  const activities = db.prepare_all(`
    SELECT ra.*, u.name as actor_name
    FROM request_activities ra
    JOIN users u ON u.id = ra.actor_id
    JOIN support_requests sr ON sr.id = ra.request_id
    WHERE ra.request_id = ? AND sr.school_id = ?
    ORDER BY ra.created_at ASC
  `, [req.params.id, schoolId]);
  return res.json(activities);
});

export default router;
