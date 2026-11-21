import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { requireAuth, AuthedRequest } from '../security';

const router = Router();

router.use(requireAuth);

// GET /api/dashboard
router.get('/', (req: Request, res: Response) => {
  const { role, schoolId } = req as AuthedRequest;
  if (role !== 'leader' && role !== 'professional' && role !== 'admin') {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const db = getDb();
  const isAdmin = role === 'admin';

  const statsSql = isAdmin
    ? `SELECT COUNT(*) as total_requests, SUM(CASE WHEN status='Submitted' THEN 1 ELSE 0 END) as submitted, SUM(CASE WHEN status='Under Review' THEN 1 ELSE 0 END) as under_review, SUM(CASE WHEN status='Assigned' THEN 1 ELSE 0 END) as assigned, SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='Closed' THEN 1 ELSE 0 END) as closed FROM support_requests sr`
    : `SELECT COUNT(*) as total_requests, SUM(CASE WHEN status='Submitted' THEN 1 ELSE 0 END) as submitted, SUM(CASE WHEN status='Under Review' THEN 1 ELSE 0 END) as under_review, SUM(CASE WHEN status='Assigned' THEN 1 ELSE 0 END) as assigned, SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) as completed, SUM(CASE WHEN status='Closed' THEN 1 ELSE 0 END) as closed FROM support_requests sr WHERE sr.school_id = ?`;

  const stats = db.prepare_get<any>(statsSql, isAdmin ? [] : [schoolId]) ?? {};

  const avgSql = isAdmin
    ? `SELECT AVG(julianday(ra.created_at) - julianday(sr.submitted_at)) as avg_days FROM request_activities ra JOIN support_requests sr ON sr.id = ra.request_id WHERE ra.action LIKE 'Status changed to Under Review'`
    : `SELECT AVG(julianday(ra.created_at) - julianday(sr.submitted_at)) as avg_days FROM request_activities ra JOIN support_requests sr ON sr.id = ra.request_id WHERE ra.action LIKE 'Status changed to Under Review' AND sr.school_id = ?`;

  const avgQuery = db.prepare_get<any>(avgSql, isAdmin ? [] : [schoolId]);

  const parentSql = isAdmin
    ? `SELECT COUNT(*) as c FROM parent_inquiries`
    : `SELECT COUNT(*) as c FROM parent_inquiries WHERE school_id = ?`;
  const parentCount = db.prepare_get<any>(parentSql, isAdmin ? [] : [schoolId]);

  const cpdSql = isAdmin
    ? `SELECT COUNT(*) as c, SUM(participants) as total_participants FROM cpd_activities`
    : `SELECT COUNT(*) as c, SUM(participants) as total_participants FROM cpd_activities WHERE school_id = ?`;
  const cpdCount = db.prepare_get<any>(cpdSql, isAdmin ? [] : [schoolId]);

  const cholisSql = isAdmin
    ? `SELECT COUNT(*) as c FROM support_requests WHERE cholis_requested_at IS NOT NULL`
    : `SELECT COUNT(*) as c FROM support_requests WHERE cholis_requested_at IS NOT NULL AND school_id = ?`;
  const cholisCount = db.prepare_get<any>(cholisSql, isAdmin ? [] : [schoolId]);

  const trendSql = isAdmin
    ? `SELECT strftime('%Y-%m', submitted_at) as month, COUNT(*) as count FROM support_requests GROUP BY month ORDER BY month DESC LIMIT 6`
    : `SELECT strftime('%Y-%m', submitted_at) as month, COUNT(*) as count FROM support_requests WHERE school_id = ? GROUP BY month ORDER BY month DESC LIMIT 6`;
  const monthlyTrend = db.prepare_all(trendSql, isAdmin ? [] : [schoolId]);

  const catSql = isAdmin
    ? `SELECT category, COUNT(*) as count FROM support_requests GROUP BY category ORDER BY count DESC`
    : `SELECT category, COUNT(*) as count FROM support_requests WHERE school_id = ? GROUP BY category ORDER BY count DESC`;
  const byCategory = db.prepare_all(catSql, isAdmin ? [] : [schoolId]);

  return res.json({
    total_requests: stats.total_requests ?? 0,
    submitted: stats.submitted ?? 0,
    under_review: stats.under_review ?? 0,
    assigned: stats.assigned ?? 0,
    completed: stats.completed ?? 0,
    closed: stats.closed ?? 0,
    avg_response_days: avgQuery?.avg_days != null ? Math.round(Number(avgQuery.avg_days) * 10) / 10 : null,
    parent_inquiries: parentCount?.c ?? 0,
    cpd_activities: cpdCount?.c ?? 0,
    cpd_participants: cpdCount?.total_participants ?? 0,
    cholis_referrals: cholisCount?.c ?? 0,
    monthly_trend: monthlyTrend,
    by_category: byCategory,
  });
});

// GET /api/dashboard/professionals
router.get('/professionals', (req: Request, res: Response) => {
  const { role, schoolId } = req as AuthedRequest;
  if (role !== 'professional' && role !== 'admin') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  const db = getDb();
  const profs = db.prepare_all(`SELECT id, name, position FROM users WHERE school_id = ? AND role = 'professional' ORDER BY position`, [schoolId]);
  return res.json(profs);
});

// GET /api/dashboard/cholis-referrals
// For CHOLIS administrators: requests where a school's department has asked
// CHOLIS for extra support. Teacher observations are never included.
router.get('/cholis-referrals', (req: Request, res: Response) => {
  const { role } = req as AuthedRequest;
  if (role !== 'admin') return res.status(403).json({ error: 'Access denied.' });
  const rows = getDb().prepare_all(`
    SELECT sr.id, s.name as school_name, sr.learner_ref, sr.classroom, sr.category, sr.routed_to,
           sr.status, sr.cholis_requested_at, sr.cholis_note
    FROM support_requests sr JOIN schools s ON s.id = sr.school_id
    WHERE sr.cholis_requested_at IS NOT NULL
    ORDER BY sr.cholis_requested_at DESC
  `);
  return res.json(rows);
});

// GET /api/dashboard/cpd
router.get('/cpd', (req: Request, res: Response) => {
  const { role, schoolId } = req as AuthedRequest;
  if (role !== 'leader' && role !== 'professional' && role !== 'admin') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  const db = getDb();
  const isAdmin = role === 'admin';
  const cpd = db.prepare_all(
    isAdmin ? `SELECT * FROM cpd_activities ORDER BY activity_date DESC`
            : `SELECT * FROM cpd_activities WHERE school_id = ? ORDER BY activity_date DESC`,
    isAdmin ? [] : [schoolId]
  );
  return res.json(cpd);
});

export default router;
