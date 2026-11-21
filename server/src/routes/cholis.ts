import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '../db';
import { requireAuth, AuthedRequest, tooLong } from '../security';
import { notifyUsers, departmentStaffIds } from '../notify';

// The CHOLIS Inbox: everything schools' departments have asked CHOLIS for,
// across all schools. Learner referrals never include teacher observations.

const STATUSES = ['New', 'In progress', 'Completed'];
const router = Router();
router.use(requireAuth);
router.use((req: Request, res: Response, next: NextFunction) => {
  const { role } = req as AuthedRequest;
  if (role !== 'cholis' && role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  return next();
});

// GET /api/cholis/inbox
router.get('/inbox', (_req: Request, res: Response) => {
  const db = getDb();
  const referrals = db.prepare_all<any>(`
    SELECT sr.id, sr.school_id, s.name as school_name, sr.learner_ref, sr.classroom, sr.category, sr.routed_to,
           sr.status as school_status, sr.cholis_requested_at as created_at, sr.cholis_note as summary,
           COALESCE(sr.cholis_status, 'New') as status, sr.cholis_response, sr.cholis_assignee_id,
           a.name as assignee_name
    FROM support_requests sr
    JOIN schools s ON s.id = sr.school_id
    LEFT JOIN users a ON a.id = sr.cholis_assignee_id
    WHERE sr.cholis_requested_at IS NOT NULL`);
  const dept = db.prepare_all<any>(`
    SELECT dr.id, dr.school_id, s.name as school_name, dr.topic, dr.summary, dr.details, dr.preferred_timing, dr.urgency,
           dr.status, dr.cholis_response, dr.cholis_assignee_id, dr.created_at,
           u.name as requester_name, u.position as requester_position, a.name as assignee_name
    FROM department_requests dr
    JOIN schools s ON s.id = dr.school_id
    JOIN users u ON u.id = dr.requester_id
    LEFT JOIN users a ON a.id = dr.cholis_assignee_id`);
  const items = [
    ...referrals.map(r => ({ ...r, type: 'learner_referral' })),
    ...dept.map(d => ({ ...d, type: 'department_request' })),
  ].sort((x, y) => String(y.created_at).localeCompare(String(x.created_at)));
  res.json(items);
});

// GET /api/cholis/team
router.get('/team', (_req: Request, res: Response) => {
  res.json(getDb().prepare_all(`SELECT id, name, position, role FROM users WHERE role IN ('cholis','admin') ORDER BY name`));
});

function update(table: 'support_requests' | 'department_requests', req: Request, res: Response) {
  const { userId, userName } = req as AuthedRequest;
  const { status, cholis_response, assign_to_me } = req.body as { status?: string; cholis_response?: string; assign_to_me?: boolean };
  if (status && !STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const lengthError = tooLong(req.body, { cholis_response: 500 });
  if (lengthError) return res.status(400).json({ error: lengthError });

  const db = getDb();
  const isReferral = table === 'support_requests';
  const existing = db.prepare_get<any>(
    `SELECT * FROM ${table} WHERE id = ?${isReferral ? ' AND cholis_requested_at IS NOT NULL' : ''}`, [req.params.id]
  );
  if (!existing) return res.status(404).json({ error: 'Request not found.' });

  const statusCol = isReferral ? 'cholis_status' : 'status';
  const oldStatus = existing[statusCol] ?? 'New';
  const newStatus = status ?? (assign_to_me && oldStatus === 'New' ? 'In progress' : oldStatus);
  const newResponse = cholis_response !== undefined ? (cholis_response.trim() || null) : existing.cholis_response;
  const newAssignee = assign_to_me ? userId : existing.cholis_assignee_id;
  const now = new Date().toISOString();

  db.prepare_run(
    `UPDATE ${table} SET ${statusCol} = ?, cholis_response = ?, cholis_assignee_id = ?, updated_at = ? WHERE id = ?`,
    [newStatus, newResponse, newAssignee, now, req.params.id]
  );

  // Tell the school's department what changed.
  const changes: string[] = [];
  if (newStatus !== oldStatus) changes.push(`status: ${newStatus}`);
  if (assign_to_me && existing.cholis_assignee_id !== userId) changes.push(`picked up by ${userName}`);
  if (cholis_response?.trim() && cholis_response.trim() !== existing.cholis_response) changes.push('new reply');
  if (changes.length) {
    const what = isReferral ? `learner ${existing.learner_ref}` : `"${existing.summary}"`;
    notifyUsers(departmentStaffIds(existing.school_id), {
      kind: 'cholis_reply', refId: existing.id, schoolId: existing.school_id,
      title: `CHOLIS update on ${what}`,
      body: changes.join(' · ') + (cholis_response?.trim() ? ` — "${cholis_response.trim()}"` : ''),
    });
    if (isReferral) {
      db.prepare_run(
        `INSERT INTO request_activities (id,request_id,actor_id,action,note,created_at) VALUES (lower(hex(randomblob(16))),?,?,?,?,?)`,
        [existing.id, userId, `CHOLIS update (${changes.join(', ')})`, cholis_response?.trim() || null, now]
      );
    }
  }
  db.save();
  return res.json({ ok: true });
}

// PATCH /api/cholis/referrals/:id
router.patch('/referrals/:id', (req, res) => update('support_requests', req, res));
// PATCH /api/cholis/department-requests/:id
router.patch('/department-requests/:id', (req, res) => update('department_requests', req, res));

export default router;
