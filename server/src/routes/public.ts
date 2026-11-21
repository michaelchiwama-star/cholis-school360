import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, AuthedRequest, tooLong } from '../security';
import { notifyUsers, cholisStaffIds, departmentStaffIds, emailCholis } from '../notify';
import { PARENT_TOPICS } from './parentEnquiries';

const router = Router();

// GET /api/public/parent-options — schools a parent can choose, and enquiry topics
router.get('/parent-options', (_req: Request, res: Response) => {
  const db = getDb();
  const schools = db.prepare_all(`SELECT id, name, district FROM schools WHERE alliance_member = 1 AND id != 'school-cholis-admin' ORDER BY name`);
  return res.json({ schools, topics: PARENT_TOPICS });
});

// POST /api/public/parent-inquiry
router.post('/parent-inquiry', (req: Request, res: Response) => {
  const { school_id, route_to, topic, contact_name, contact_email, contact_phone, message } = req.body as {
    school_id?: string; route_to?: string; topic?: string; contact_name: string; contact_email?: string;
    contact_phone?: string; message: string;
  };
  if (!contact_name?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Name and message are required.' });
  }
  if (!contact_phone?.trim() && !contact_email?.trim()) {
    return res.status(400).json({ error: 'Please give a phone number or an email address so we can contact you.' });
  }
  const lengthError = tooLong(req.body, { contact_name: 100, contact_email: 120, contact_phone: 30, message: 1500 });
  if (lengthError) return res.status(400).json({ error: lengthError });
  const chosenTopic = topic && PARENT_TOPICS.includes(topic) ? topic : 'Other';

  const db = getDb();
  // Only accept a School360 school that actually exists.
  const school = school_id
    ? db.prepare_get<any>(`SELECT id, name FROM schools WHERE id = ? AND alliance_member = 1 AND id != 'school-cholis-admin'`, [school_id])
    : undefined;
  if (route_to === 'school' && !school) {
    return res.status(400).json({ error: "Please choose your child's school, or send your enquiry to CHOLIS." });
  }
  const route = route_to === 'school' ? 'school' : 'cholis';
  const id = uuidv4();
  const now = new Date().toISOString();
  db.prepare_run(`
    INSERT INTO parent_inquiries (id,school_id,contact_name,contact_email,contact_phone,message,status,route_to,topic,submitted_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `, [id, school?.id ?? null, contact_name.trim(), contact_email?.trim() || null, contact_phone?.trim() || null,
      message.trim(), 'New', route, chosenTopic, now, now]);

  if (route === 'school') {
    notifyUsers(departmentStaffIds(school.id), {
      kind: 'parent_enquiry', refId: id, schoolId: school.id,
      title: 'New parent enquiry', body: chosenTopic,
    });
  } else {
    const where = school ? school.name : 'a school not yet on School360';
    notifyUsers(cholisStaffIds(), {
      kind: 'parent_enquiry', refId: id, schoolId: school?.id ?? '',
      title: 'New parent enquiry for CHOLIS', body: `${chosenTopic} · ${where}`,
    });
    void emailCholis('School360: new parent enquiry', `A parent or guardian (${where}) has sent an enquiry to CHOLIS about: ${chosenTopic}.`);
  }
  db.save();
  const who = route === 'school' ? `${school.name}'s Counselling and Learner Support Department` : 'The CHOLIS team';
  return res.status(201).json({ id, message: `Thank you. ${who} will contact you.` });
});

// POST /api/public/consultation-inquiry
router.post('/consultation-inquiry', (req: Request, res: Response) => {
  const { school_name, contact_name, contact_email, contact_phone, district, province, message, inquiry_type } = req.body as {
    school_name: string; contact_name: string; contact_email: string;
    contact_phone?: string; district?: string; province?: string;
    message?: string; inquiry_type?: string;
  };
  if (!school_name || !contact_name || !contact_email) {
    return res.status(400).json({ error: 'School name, contact name, and email are required.' });
  }
  const lengthError = tooLong(req.body, {
    school_name: 150, contact_name: 100, contact_email: 120, contact_phone: 30,
    district: 80, province: 80, message: 1500,
  });
  if (lengthError) return res.status(400).json({ error: lengthError });
  const type = inquiry_type === 'Membership Application' ? 'Membership Application' : 'Consultation';

  const db = getDb();
  const id = uuidv4();
  db.prepare_run(`
    INSERT INTO consultation_inquiries (id,school_name,contact_name,contact_email,contact_phone,district,province,message,inquiry_type,status)
    VALUES (?,?,?,?,?,?,?,?,?,?)
  `, [id, school_name, contact_name, contact_email, contact_phone ?? null, district ?? null, province ?? null, message ?? null, type, 'New']);
  db.save();
  return res.status(201).json({ id, message: 'Thank you. We will be in touch shortly.' });
});

// GET /api/public/schools
router.get('/schools', (_req: Request, res: Response) => {
  const db = getDb();
  const schools = db.prepare_all(`SELECT id, name, district, province FROM schools WHERE alliance_member = 1 AND id != 'school-cholis-admin'`);
  return res.json(schools);
});

// GET /api/public/inquiries — CHOLIS administrators only (verified session)
router.get('/inquiries', requireAuth, (req: Request, res: Response) => {
  const { role } = req as AuthedRequest;
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  const db = getDb();
  const consultations = db.prepare_all('SELECT * FROM consultation_inquiries ORDER BY submitted_at DESC');
  const parents = db.prepare_all(`
    SELECT pi.*, s.name as school_name FROM parent_inquiries pi
    LEFT JOIN schools s ON s.id = pi.school_id
    ORDER BY pi.submitted_at DESC
  `).map((p: any) => (p.route_to === 'school'
    ? { ...p, message: null, contact_name: null, contact_phone: null, contact_email: null, masked: true }
    : p));
  return res.json({ consultations, parents });
});

export default router;
