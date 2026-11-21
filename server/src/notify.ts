import { v4 as uuidv4 } from 'uuid';
import { getDb } from './db';

/* In-app notifications (the bell) and email alerts to CHOLIS.
 *
 * Email is optional. Set these in Render → Environment to switch it on:
 *   BREVO_API_KEY        API key from a free Brevo account (brevo.com)
 *   NOTIFY_FROM_EMAIL    a sender address you have verified in Brevo
 *   CHOLIS_NOTIFY_EMAILS comma-separated list of CHOLIS addresses to alert
 *   NOTIFY_FROM_NAME     optional, defaults to "CHOLIS School360"
 *   APP_URL              optional, e.g. https://cholis-school360.onrender.com
 *
 * Emails never contain learner details — only the school, the kind of
 * request and a prompt to sign in.
 */

export interface NotificationInput {
  kind: string;       // e.g. 'learner_referral', 'department_request', 'cholis_reply'
  refId: string;
  schoolId: string;
  title: string;
  body?: string;
}

/** Adds a notification to the bell of each user. */
export function notifyUsers(userIds: string[], n: NotificationInput) {
  const db = getDb();
  const now = new Date().toISOString();
  for (const userId of new Set(userIds)) {
    db.prepare_run(
      `INSERT INTO notifications (id,user_id,kind,ref_id,school_id,title,body,created_at) VALUES (?,?,?,?,?,?,?,?)`,
      [uuidv4(), userId, n.kind, n.refId, n.schoolId, n.title, n.body ?? null, now]
    );
  }
}

/** All CHOLIS professionals and administrators. */
export function cholisStaffIds(): string[] {
  return getDb().prepare_all<{ id: string }>(`SELECT id FROM users WHERE role IN ('cholis','admin')`).map(u => u.id);
}

/** Counselling and Learner Support Department staff at one school. */
export function departmentStaffIds(schoolId: string): string[] {
  return getDb().prepare_all<{ id: string }>(`SELECT id FROM users WHERE role = 'professional' AND school_id = ?`, [schoolId]).map(u => u.id);
}

export function emailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY && process.env.NOTIFY_FROM_EMAIL && process.env.CHOLIS_NOTIFY_EMAILS);
}

/** Sends an alert email to CHOLIS. Never throws: a failed email must not break the app. */
export async function emailCholis(subject: string, text: string): Promise<void> {
  if (!emailConfigured()) return;
  const to = (process.env.CHOLIS_NOTIFY_EMAILS ?? '')
    .split(',').map(s => s.trim()).filter(Boolean).map(email => ({ email }));
  if (to.length === 0) return;
  const appUrl = (process.env.APP_URL ?? '').trim();
  const fullText = `${text}\n\n${appUrl ? `Sign in to School360 to view it: ${appUrl}` : 'Sign in to School360 to view it.'}\n\nThis alert contains no learner details by design.`;
  try {
    const r = await fetch(process.env.BREVO_API_URL || 'https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': process.env.BREVO_API_KEY as string, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { email: process.env.NOTIFY_FROM_EMAIL, name: process.env.NOTIFY_FROM_NAME || 'CHOLIS School360' },
        to,
        subject,
        textContent: fullText,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) console.error(`[email] Brevo error ${r.status}: ${(await r.text().catch(() => '')).slice(0, 300)}`);
  } catch (err: any) {
    console.error('[email] Sending failed:', err?.message ?? err);
  }
}

export function schoolName(schoolId: string): string {
  return getDb().prepare_get<any>('SELECT name FROM schools WHERE id = ?', [schoolId])?.name ?? 'a school';
}
