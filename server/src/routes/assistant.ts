// CHOLIS Teacher Support Assistant — connection to IBM watsonx Orchestrate
//
// This file passes a teacher's question to your Orchestrate agent and returns the answer.
// The secret key is read from Render's Environment settings. It is NEVER written in code.
//
// Required environment variables (set them in Render → your service → Environment):
//   WXO_INSTANCE_URL  e.g. https://api.us-south.watson-orchestrate.cloud.ibm.com/instances/xxxx
//   WXO_API_KEY       the API key you generated in Orchestrate → Settings → API details
//   WXO_AGENT_ID      the ID of your "CHOLIS Teacher Support Assistant" agent
// Optional:
//   WXO_IAM_URL       only if IBM tells you to use a different sign-in address

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, AuthedRequest } from '../security';
import { getDb } from '../db';

const router = Router();

const INSTANCE_URL = (process.env.WXO_INSTANCE_URL ?? '').trim().replace(/\/+$/, '');
const API_KEY = (process.env.WXO_API_KEY ?? '').trim();
const AGENT_ID = (process.env.WXO_AGENT_ID ?? '').trim();
const IAM_URL_OVERRIDE = (process.env.WXO_IAM_URL ?? '').trim().replace(/\/+$/, '');

const isConfigured = () => Boolean(INSTANCE_URL && API_KEY && AGENT_ID);

// Uses the app's real, server-checked sign-in. Leaders and parents cannot use the assistant.
function allowAssistantRoles(req: Request, res: Response, next: NextFunction) {
  const { role } = req as AuthedRequest;
  if (!['teacher', 'professional', 'admin'].includes(role)) {
    return res.status(403).json({ error: 'The assistant is available to teachers and Counselling and Learner Support Department staff.' });
  }
  return next();
}

// ---- Step 1: swap the API key for a short-lived access token (cached ~55 min) ----
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

  const onIbmCloud = INSTANCE_URL.includes('cloud.ibm.com');
  let token: string | undefined;
  let lifetimeSeconds = 3600;

  if (onIbmCloud && !IAM_URL_OVERRIDE) {
    // Orchestrate hosted on IBM Cloud
    const r = await fetch('https://iam.cloud.ibm.com/identity/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
        apikey: API_KEY,
      }).toString(),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`IBM Cloud sign-in failed (status ${r.status}). Check WXO_API_KEY.`);
    const j: any = await r.json();
    token = j.access_token;
    lifetimeSeconds = Number(j.expires_in) || 3600;
  } else {
    // Orchestrate hosted on AWS / IBM SaaS platform
    const iamBase = IAM_URL_OVERRIDE || 'https://iam.platform.saas.ibm.com';
    const r = await fetch(`${iamBase}/siusermgr/api/1.0/apikeys/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ apikey: API_KEY }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`IBM sign-in failed (status ${r.status}). Check WXO_API_KEY.`);
    const j: any = await r.json();
    token = j.token ?? j.access_token;
    lifetimeSeconds = Number(j.expires_in) || 3600;
  }

  if (!token) throw new Error('IBM sign-in returned no token.');
  cachedToken = { value: token, expiresAt: Date.now() + Math.max(60, lifetimeSeconds - 300) * 1000 };
  return token;
}

// ---- Step 2: pull the answer text out of Orchestrate's reply ----
function extractAnswer(data: any): string {
  const choice = data?.choices?.[0];
  const content = choice?.message?.content ?? choice?.delta?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part: any) => (typeof part === 'string' ? part : part?.text ?? ''))
      .filter(Boolean)
      .join('\n\n')
      .trim();
  }
  return '';
}

/** Tells the agent who is asking, so its advice and referral line fit the role.
 *  Teachers' questions are sent unchanged. */
function withAskerContext(r: AuthedRequest, question: string): string {
  if (r.role !== 'professional') return question;
  const me = getDb().prepare_get<any>('SELECT position FROM users WHERE id = ?', [r.userId]);
  const position = me?.position || 'member of the Counselling and Learner Support Department';
  return [
    `[Context for the assistant: the person asking is a ${position} in the school's Counselling and Learner Support Department (this may be a trainee fellow), not a classroom teacher.`,
    'Give guidance suited to department staff: which Ubuntu or Catch Up activities to use with individuals or small groups, and how to guide teachers.',
    "Do not tell them to refer the learner to themselves. Instead, where needed, suggest discussing the case with the department lead or supervisor, and that the department can request extra support from CHOLIS through School360.",
    'All safeguarding rules still apply exactly as written.]',
    '',
    question,
  ].join('\n');
}

// GET /api/assistant/status  → tells the screen whether the live agent is connected
router.get('/status', (_req: Request, res: Response) => {
  res.json({ connected: isConfigured() });
});

// POST /api/assistant/ask  { question, thread_id? } → { answer, thread_id }
router.post('/ask', requireAuth, allowAssistantRoles, async (req: Request, res: Response) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'not_configured' });
  }

  const question = String(req.body?.question ?? '').trim();
  const threadId = req.body?.thread_id ? String(req.body.thread_id) : null;
  if (!question) return res.status(400).json({ error: 'Please type a question.' });
  if (question.length > 1000) return res.status(400).json({ error: 'Please keep questions under 1,000 characters.' });

  try {
    const token = await getAccessToken();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (threadId) headers['X-IBM-THREAD-ID'] = threadId; // keeps follow-up questions in the same conversation

    const r = await fetch(`${INSTANCE_URL}/v1/orchestrate/${encodeURIComponent(AGENT_ID)}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        stream: false,
        messages: [{ role: 'user', content: withAskerContext(req as AuthedRequest, question) }],
      }),
      signal: AbortSignal.timeout(90000),
    });

    if (r.status === 401 || r.status === 403) cachedToken = null; // force a fresh sign-in next time

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error(`[assistant] Orchestrate error ${r.status}: ${detail.slice(0, 500)}`);
      return res.status(502).json({ error: 'The assistant is unavailable right now. Please try again shortly.' });
    }

    const data: any = await r.json();
    const answer = extractAnswer(data);
    if (!answer) {
      console.error('[assistant] Could not find answer text. Raw reply:', JSON.stringify(data).slice(0, 1500));
      return res.status(502).json({ error: 'The assistant replied in an unexpected format.' });
    }

    return res.json({ answer, thread_id: data.thread_id ?? threadId });
  } catch (err: any) {
    console.error('[assistant] Request failed:', err?.message ?? err);
    return res.status(502).json({ error: 'The assistant is unavailable right now. Please try again shortly.' });
  }
});

export default router;
