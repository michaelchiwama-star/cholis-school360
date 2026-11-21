import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { hashPassword } from './security';

// Where the database file lives. Locally: school360/data. Online, the folder
// starts empty each time the app starts, so the demo school is re-created.
const DATA_DIR = config.dataDir ?? path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'school360.db');

let db: SqlJsDatabase | null = null;

// Ensure data dir exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Persist db to disk
function persist() {
  if (!db) return;
  try {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  } catch (e) {
    console.error('DB persist error:', e);
  }
}

// Simple wrapper to make sql.js feel synchronous (it already is)
export class SimpleDB {
  private db: SqlJsDatabase;
  private dirty = false;

  constructor(sqlDb: SqlJsDatabase) {
    this.db = sqlDb;
  }

  exec(sql: string) {
    this.db.run(sql);
    this.dirty = true;
    return this;
  }

  prepare_run(sql: string, params: any[] = []) {
    const stmt = this.db.prepare(sql);
    stmt.run(params);
    stmt.free();
    this.dirty = true;
  }

  prepare_get<T = any>(sql: string, params: any[] = []): T | undefined {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    let row: T | undefined;
    if (stmt.step()) {
      row = stmt.getAsObject() as unknown as T;
    }
    stmt.free();
    return row;
  }

  prepare_all<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject() as unknown as T);
    }
    stmt.free();
    return rows;
  }

  save() {
    if (this.dirty) {
      persist();
      this.dirty = false;
    }
  }
}

let simpleDb: SimpleDB | null = null;

export async function initDb(): Promise<SimpleDB> {
  if (simpleDb) return simpleDb;

  ensureDataDir();
  const SQL = await initSqlJs();

  let sqlDb: SqlJsDatabase;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }
  db = sqlDb;

  simpleDb = new SimpleDB(sqlDb);
  initSchema(simpleDb);
  migrateSchema(simpleDb);
  seedDemoData(simpleDb);
  ensureDepartmentDemo(simpleDb);
  applyDemoPassword(simpleDb);
  simpleDb.save();
  return simpleDb;
}

export function getDb(): SimpleDB {
  if (!simpleDb) throw new Error('DB not initialized. Call initDb() first.');
  return simpleDb;
}

/** All accounts are fictional demonstration accounts: give each the current
 *  demo password, stored as a secure hash (this also upgrades older local
 *  databases that stored the password as plain text). */
function applyDemoPassword(db: SimpleDB) {
  const users = db.prepare_all<{ id: string }>('SELECT id FROM users');
  for (const u of users) {
    db.prepare_run('UPDATE users SET password = ? WHERE id = ?', [hashPassword(config.demoPassword), u.id]);
  }
}

function initSchema(db: SimpleDB) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      district TEXT NOT NULL,
      province TEXT NOT NULL,
      principal TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      alliance_member INTEGER DEFAULT 1,
      routing TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      position TEXT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS support_requests (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      learner_ref TEXT NOT NULL,
      classroom TEXT NOT NULL,
      category TEXT NOT NULL,
      observations TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Submitted',
      routed_to TEXT,
      assigned_to TEXT,
      cholis_requested_at TEXT,
      cholis_note TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS request_activities (
      id TEXT PRIMARY KEY,
      request_id TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      action TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS parent_inquiries (
      id TEXT PRIMARY KEY,
      school_id TEXT,
      contact_name TEXT NOT NULL,
      contact_email TEXT,
      contact_phone TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'New',
      submitted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS consultation_inquiries (
      id TEXT PRIMARY KEY,
      school_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      district TEXT,
      province TEXT,
      message TEXT,
      inquiry_type TEXT DEFAULT 'Consultation',
      status TEXT DEFAULT 'New',
      submitted_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS department_requests (
      id TEXT PRIMARY KEY,
      school_id TEXT NOT NULL,
      requester_id TEXT NOT NULL,
      topic TEXT NOT NULL,
      summary TEXT NOT NULL,
      details TEXT NOT NULL,
      preferred_timing TEXT,
      urgency TEXT DEFAULT 'Routine',
      status TEXT DEFAULT 'New',
      cholis_response TEXT,
      cholis_assignee_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      ref_id TEXT,
      school_id TEXT,
      title TEXT NOT NULL,
      body TEXT,
      read_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cpd_activities (
      id TEXT PRIMARY KEY,
      school_id TEXT,
      title TEXT NOT NULL,
      facilitator TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      participants INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

/** Adds newer columns to databases created by earlier versions. */
function migrateSchema(db: SimpleDB) {
  const addColumn = (table: string, column: string, type: string) => {
    const cols = db.prepare_all<{ name: string }>(`PRAGMA table_info(${table})`).map(c => c.name);
    if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  };
  addColumn('schools', 'routing', 'TEXT');
  addColumn('parent_inquiries', 'route_to', 'TEXT');
  addColumn('parent_inquiries', 'topic', 'TEXT');
  addColumn('parent_inquiries', 'handled_by_id', 'TEXT');
  addColumn('parent_inquiries', 'updated_at', 'TEXT');
  addColumn('users', 'position', 'TEXT');
  addColumn('support_requests', 'routed_to', 'TEXT');
  addColumn('support_requests', 'cholis_requested_at', 'TEXT');
  addColumn('support_requests', 'cholis_note', 'TEXT');
  addColumn('support_requests', 'cholis_status', 'TEXT');
  addColumn('support_requests', 'cholis_response', 'TEXT');
  addColumn('support_requests', 'cholis_assignee_id', 'TEXT');
  addColumn('department_requests', 'cholis_assignee_id', 'TEXT');
}

/** Makes sure the demo school has its Counselling and Learner Support
 *  Department staff, and that every request says who it was sent to. */
function ensureDepartmentDemo(db: SimpleDB) {
  const schoolId = 'school-mwamba-001';
  if (!db.prepare_get('SELECT id FROM schools WHERE id = ?', [schoolId])) return;
  db.prepare_run(`UPDATE users SET position = 'School Counsellor' WHERE id = 'user-prof-001' AND (position IS NULL OR position = '')`);
  if (!db.prepare_get(`SELECT id FROM users WHERE id = 'user-prof-002'`)) {
    db.prepare_run(
      `INSERT INTO users (id,school_id,name,role,position,username,password) VALUES (?,?,?,?,?,?,?)`,
      ['user-prof-002', schoolId, 'Ms. Changu Mbozi', 'professional', 'Learner Support Coordinator', 'support1', 'unset']
    );
  }
  if (!db.prepare_get(`SELECT id FROM department_requests WHERE id = 'dreq-001'`)) {
    const d = new Date(Date.now() - 3 * 86400000).toISOString();
    db.prepare_run(
      `INSERT INTO department_requests (id,school_id,requester_id,topic,summary,details,preferred_timing,urgency,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      ['dreq-001', schoolId, 'user-prof-001', 'Staff training or CPD', 'Positive discipline training for Grade 4–7 teachers',
       'Several teachers have asked for practical alternatives to punishment for large classes. We would like a 2-hour CPD session with practice activities.',
       'Any Friday afternoon this term', 'Routine', 'New', d, d]
    );
  }
  // The separate CHOLIS Professional demo account was retired: the CHOLIS Administrator runs the inbox.
  db.prepare_run(`DELETE FROM notifications WHERE user_id = 'user-cholis-001'`);
  db.prepare_run(`DELETE FROM users WHERE id = 'user-cholis-001'`);
  if (!db.prepare_get(`SELECT id FROM notifications WHERE kind IN ('learner_referral','department_request') LIMIT 1`)) {
    // Starting notifications so the demo inbox shows how alerts look.
    const staff = db.prepare_all<{ id: string }>(`SELECT id FROM users WHERE role IN ('cholis','admin')`);
    const seeds = [
      ['learner_referral', 'req-002', 'New learner referral from Mwamba Academy', 'Classroom behaviour · from the School Counsellor'],
      ['department_request', 'dreq-001', 'New department request from Mwamba Academy', 'Staff training or CPD · Positive discipline training for Grade 4–7 teachers'],
    ];
    for (const u of staff) for (const [kind, ref, title, body] of seeds) {
      db.prepare_run(
        `INSERT INTO notifications (id,user_id,kind,ref_id,school_id,title,body) VALUES (?,?,?,?,?,?,?)`,
        [uuidv4(), u.id, kind, ref, schoolId, title, body]
      );
    }
  }
  // Parent enquiries: who should respond (school department by default, or CHOLIS)
  db.prepare_run(`UPDATE parent_inquiries SET route_to = CASE WHEN school_id IS NULL THEN 'cholis' ELSE 'school' END WHERE route_to IS NULL`);
  db.prepare_run(`UPDATE parent_inquiries SET topic = 'Supporting learning at home' WHERE topic IS NULL AND contact_name = 'Grace Mwale'`);
  db.prepare_run(`UPDATE parent_inquiries SET topic = 'Other' WHERE topic IS NULL`);
  db.prepare_run(`UPDATE parent_inquiries SET status = 'Contacted' WHERE status = 'Reviewed'`);
  if (!db.prepare_get(`SELECT id FROM parent_inquiries WHERE id = 'pinq-002'`)) {
    const d2 = new Date(Date.now() - 2 * 86400000).toISOString();
    db.prepare_run(
      `INSERT INTO parent_inquiries (id,school_id,contact_name,contact_email,contact_phone,message,status,route_to,topic,submitted_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      ['pinq-002', schoolId, 'Mr. Daniel Chileshe', null, '+260 96 5550199', 'My son has become very quiet at home since the start of term. I would like to talk to someone at the school about how to support him.', 'New', 'school', 'Emotional wellbeing', d2, d2]
    );
    db.prepare_run(
      `INSERT INTO parent_inquiries (id,school_id,contact_name,contact_email,contact_phone,message,status,route_to,topic,submitted_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      ['pinq-003', null, 'Mrs. Ruth Banda', 'ruth.parent@example.com', null, 'Our school does not have a counsellor. Are there talks for parents on supporting teenagers through exam stress?', 'New', 'cholis', 'Teenage development', d2, d2]
    );
  }
  const counsellorCats = ['Classroom behaviour', 'Emotional wellbeing', 'Peer relationships', 'Other'];
  db.prepare_run(
    `UPDATE support_requests SET routed_to = CASE WHEN category IN (${counsellorCats.map(() => '?').join(',')}) THEN 'School Counsellor' ELSE 'Learner Support Coordinator' END WHERE routed_to IS NULL`,
    counsellorCats
  );
}

function seedDemoData(db: SimpleDB) {
  const schoolCount = db.prepare_get<{ c: number }>('SELECT COUNT(*) as c FROM schools');
  if ((schoolCount?.c ?? 0) > 0) return;

  const schoolId = 'school-mwamba-001';
  const adminSchoolId = 'school-cholis-admin';

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

  // Schools
  db.prepare_run(
    `INSERT INTO schools (id,name,district,province,principal,email,phone,alliance_member) VALUES (?,?,?,?,?,?,?,?)`,
    [schoolId, 'Mwamba Academy', 'Lusaka', 'Lusaka Province', 'Mrs. Josephine Zulu', 'admin@mwambaacademy.edu.zm', '+260 97 1234567', 1]
  );
  db.prepare_run(
    `INSERT INTO schools (id,name,district,province,principal,email,phone,alliance_member) VALUES (?,?,?,?,?,?,?,?)`,
    [adminSchoolId, 'CHOLIS Administration', 'Lusaka', 'Lusaka Province', 'CHOLIS Director', 'info@allholisticschools.org', '+260 97 9876543', 1]
  );

  const teacherId1 = 'user-teacher-001';
  const teacherId2 = 'user-teacher-002';
  const profId1 = 'user-prof-001';
  const leaderId1 = 'user-leader-001';
  const adminId1 = 'user-admin-001';

  // Passwords are set (as secure hashes) by applyDemoPassword() after seeding.
  const profId2 = 'user-prof-002';
  const users = [
    [teacherId1, schoolId, 'Ms. Beatrice Mulenga', 'teacher', null, 'teacher1', 'unset'],
    [teacherId2, schoolId, 'Ms. Gracious Singogo', 'teacher', null, 'teacher2', 'unset'],
    [profId1, schoolId, 'Ms. Mercy Mwakibinga', 'professional', 'School Counsellor', 'professional1', 'unset'],
    [profId2, schoolId, 'Ms. Changu Mbozi', 'professional', 'Learner Support Coordinator', 'support1', 'unset'],
    [leaderId1, schoolId, 'Mrs. Josephine Zulu', 'leader', 'Head Teacher', 'leader1', 'unset'],
    [adminId1, adminSchoolId, 'Ms. Chola Mwewa', 'admin', 'CHOLIS Administrator', 'admin1', 'unset'],
  ];
  for (const u of users) {
    db.prepare_run(
      `INSERT INTO users (id,school_id,name,role,position,username,password) VALUES (?,?,?,?,?,?,?)`, u
    );
  }

  // Support requests
  const requests = [
    { id: 'req-001', school_id: schoolId, teacher_id: teacherId1, learner_ref: 'LRN-2024-042', classroom: 'Grade 6B', category: 'Learning difficulties', observations: 'Learner frequently loses place when reading aloud and has difficulty retaining multi-step instructions. Classroom engagement has decreased over the past three weeks.', status: 'Completed', assigned_to: profId2, submitted_at: daysAgo(18), updated_at: daysAgo(5) },
    { id: 'req-002', school_id: schoolId, teacher_id: teacherId2, learner_ref: 'LRN-2024-078', classroom: 'Grade 4A', category: 'Classroom behaviour', observations: 'Learner is regularly disruptive during group work activities and has difficulty waiting for turns. Other learners are beginning to avoid working with them.', status: 'Assigned', assigned_to: profId1, submitted_at: daysAgo(10), updated_at: daysAgo(7) },
    { id: 'req-003', school_id: schoolId, teacher_id: teacherId1, learner_ref: 'LRN-2024-015', classroom: 'Grade 6B', category: 'Emotional wellbeing', observations: 'Learner has appeared withdrawn over the past two weeks, rarely participates in class discussions, and was observed crying quietly after break time.', status: 'Under Review', assigned_to: null, submitted_at: daysAgo(5), updated_at: daysAgo(4) },
    { id: 'req-004', school_id: schoolId, teacher_id: teacherId2, learner_ref: 'LRN-2024-103', classroom: 'Grade 4A', category: 'Attendance', observations: 'Learner has been absent for 8 days in the past month without consistent communication from home. When present, learner seems fatigued.', status: 'Submitted', assigned_to: null, submitted_at: daysAgo(2), updated_at: daysAgo(2) },
    { id: 'req-005', school_id: schoolId, teacher_id: teacherId1, learner_ref: 'LRN-2024-067', classroom: 'Grade 6B', category: 'Peer relationships', observations: 'Learner eats alone during break and has mentioned to me that they do not have friends in class. They appear socially anxious in group settings.', status: 'Submitted', assigned_to: null, submitted_at: daysAgo(1), updated_at: daysAgo(1) },
  ];

  for (const r of requests) {
    db.prepare_run(
      `INSERT INTO support_requests (id,school_id,teacher_id,learner_ref,classroom,category,observations,status,assigned_to,submitted_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [r.id, r.school_id, r.teacher_id, r.learner_ref, r.classroom, r.category, r.observations, r.status, r.assigned_to, r.submitted_at, r.updated_at]
    );
  }

  // One request where the department has asked CHOLIS for extra support
  db.prepare_run(
    `UPDATE support_requests SET cholis_requested_at = ?, cholis_note = ? WHERE id = 'req-002'`,
    [daysAgo(6), 'Department requests a CHOLIS classroom observation and behaviour support planning session.']
  );

  // Activity log
  const activities = [
    [uuidv4(), 'req-002', profId1, 'Additional support requested from CHOLIS', 'Department requests a CHOLIS classroom observation and behaviour support planning session.', daysAgo(6)],
    [uuidv4(), 'req-001', profId2, 'Status changed to Under Review', null, daysAgo(17)],
    [uuidv4(), 'req-001', profId2, 'Status changed to Assigned', 'Assigned to Ms. Changu Mbozi for follow-up', daysAgo(15)],
    [uuidv4(), 'req-001', profId2, 'Status changed to Completed', 'Learner assessment completed. Classroom strategies shared with teacher.', daysAgo(5)],
    [uuidv4(), 'req-002', profId1, 'Status changed to Under Review', null, daysAgo(9)],
    [uuidv4(), 'req-002', profId1, 'Status changed to Assigned', 'Scheduled classroom observation for next week.', daysAgo(7)],
    [uuidv4(), 'req-003', profId1, 'Status changed to Under Review', 'Will review with teacher before scheduling intervention.', daysAgo(4)],
  ];
  for (const a of activities) {
    db.prepare_run(
      `INSERT INTO request_activities (id,request_id,actor_id,action,note,created_at) VALUES (?,?,?,?,?,?)`, a
    );
  }

  // CPD
  db.prepare_run(
    `INSERT INTO cpd_activities (id,school_id,title,facilitator,activity_date,participants,notes) VALUES (?,?,?,?,?,?,?)`,
    [uuidv4(), schoolId, 'Positive Classroom Behaviour Management', 'Ms. Mercy Mwakibinga', daysAgo(45), 24, 'Well-attended session. Teachers requested follow-up practical tools.']
  );
  db.prepare_run(
    `INSERT INTO cpd_activities (id,school_id,title,facilitator,activity_date,participants,notes) VALUES (?,?,?,?,?,?,?)`,
    [uuidv4(), schoolId, 'Inclusive Education: Strategies for the Classroom', 'Ms. Chola Mwewa', daysAgo(20), 18, 'Focus on differentiated instruction and learner support planning.']
  );

  // Parent inquiry
  db.prepare_run(
    `INSERT INTO parent_inquiries (id,school_id,contact_name,contact_email,contact_phone,message,status,submitted_at) VALUES (?,?,?,?,?,?,?,?)`,
    [uuidv4(), schoolId, 'Grace Mwale', null, '+260 97 5551234', 'I would like to understand how to better support my child with homework. They often seem frustrated in the evenings.', 'Contacted', daysAgo(12)]
  );
}
