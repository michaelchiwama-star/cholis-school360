import React, { useState, useEffect, useRef } from 'react';
import { useAuth, authHeaders } from './AuthContext';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/** Turns the agent's formatting (headings, bold, lists, tables) into tidy,
 *  safe HTML. Anything unsafe is stripped before it reaches the page. */
function formatAnswer(text: string): string {
  const html = marked.parse(text, { gfm: true, breaks: true, async: false }) as string;
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['img', 'style', 'form', 'input', 'button', 'iframe'] });
}

type Audience = 'teacher' | 'department';

const TEXT: Record<Audience, { title: string; intro: string; empty: string; placeholder: string }> = {
  teacher: {
    title: 'CHOLIS Teacher Support Assistant',
    intro: "This assistant provides general, evidence-informed classroom strategies. It does not diagnose learners, determine safeguarding responses, or replace your school's counsellors and learner support staff.",
    empty: 'Ask a question about classroom support strategies, positive behaviour management, or when to request support from your department.',
    placeholder: 'Ask a classroom support question…',
  },
  department: {
    title: 'CHOLIS Support Assistant — Department Staff',
    intro: 'For School Counsellors, Learner Support Coordinators and trainee fellows. Use it to find Ubuntu and Catch Up activities, plan classroom and small-group support, and prepare guidance for teachers. It does not diagnose learners, replace supervision, or make safeguarding decisions.',
    empty: 'Ask, for example: "Which Ubuntu SEL activities suit a small group of Grade 5 learners who struggle with anger?" or "How should I guide a teacher who has many non-readers in Grade 4?"',
    placeholder: 'Ask a question about supporting learners or teachers…',
  },
};

export default function AssistantPanel({ audience }: { audience: Audience }) {
  const { user } = useAuth();
  const t = TEXT[audience];
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/assistant/status')
      .then(r => (r.ok ? r.json() : { connected: false }))
      .then(d => setConnected(Boolean(d?.connected)))
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading || !user) return;
    const q = input.trim();
    setMessages(m => [...m, { role: 'user', text: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/assistant/ask', {
        method: 'POST',
        headers: authHeaders(user) as any,
        body: JSON.stringify({ question: q, thread_id: threadId }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (res.ok && data.answer) {
        setThreadId(data.thread_id ?? null);
        setMessages(m => [...m, { role: 'assistant', text: data.answer }]);
      } else if (res.status === 503) {
        // Live agent not configured: clearly labelled demonstration answer
        setMessages(m => [...m, { role: 'assistant', text: '[Demonstration response] ' + generateDemoAiResponse(q) }]);
      } else {
        setMessages(m => [...m, { role: 'assistant', text: data.error ?? 'The assistant is unavailable right now. Please try again shortly.' }]);
      }
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Network error. Please check your connection and try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="ai-panel">
        <div className="ai-panel-label">IBM watsonx Orchestrate</div>
        <div className="ai-panel-title">{t.title}</div>
        <br/>
        <span className="ai-panel-demo">{connected ? 'Live — IBM watsonx Orchestrate' : 'Demonstration Mode — Simulated Responses'}</span>
        <p style={{ fontSize: '0.82rem', color: '#1a3a10', marginBottom: '0.75rem' }}>
          {t.intro}{' '}
          {connected
            ? 'Responses come from the CHOLIS agent, grounded in approved CHOLIS and Ministry of Education documents. Always use your professional judgement.'
            : 'When connected to IBM watsonx Orchestrate, responses will be grounded in approved CHOLIS guidance documents.'}
        </p>
        <div className="ai-chat" ref={chatRef}>
          {messages.length === 0 && (
            <p style={{ fontSize: '0.82rem', color: '#5a6a72', fontStyle: 'italic' }}>{t.empty}</p>
          )}
          {messages.map((m, i) => (
            m.role === 'user'
              ? <div key={i} className="ai-msg user"><strong>You:</strong> {m.text}</div>
              : <div key={i} className="ai-msg assistant ai-md" dangerouslySetInnerHTML={{ __html: formatAnswer(m.text) }} />
          ))}
          {loading && <div style={{ fontSize: '0.82rem', color: '#5a6a72', fontStyle: 'italic' }}>Thinking… (the first answer can take up to 30 seconds)</div>}
        </div>
        <div className="ai-input-row">
          <input
            type="text"
            className="form-control"
            placeholder={t.placeholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button className="btn btn-primary" onClick={send} disabled={loading}>Ask</button>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#5a6a72', marginTop: '0.5rem' }}>
          Do not enter learner names or personal details. Safeguarding concerns go to your school's Child Protection Focal Person today.
        </p>
      </div>
    </div>
  );
}

function generateDemoAiResponse(question: string): string {
  const q = question.toLowerCase();
  if (q.includes('read')) return 'To support reading engagement, try using a variety of text formats at accessible reading levels. Allow learners to select topics that interest them, and use paired reading where learners support each other. Break longer texts into shorter, manageable segments. If a learner consistently struggles, submit a support request to your Learner Support Coordinator for a more detailed look.';
  if (q.includes('behav') || q.includes('routine') || q.includes('disruption')) return 'Positive behaviour support works best when expectations are clear, consistent, and communicated in advance. Acknowledge positive behaviours specifically ("I noticed how carefully you waited for your turn") rather than only responding to difficulties. Offer limited choices during transitions to reduce resistance. If a behaviour pattern persists for two or more weeks, a support request to your School Counsellor may be appropriate.';
  if (q.includes('emotion') || q.includes('sad') || q.includes('withdraw') || q.includes('anxious')) return 'When a learner appears emotionally distressed, respond with calm presence rather than direct questioning in the classroom. Create a brief, private moment to check in if appropriate. Refer to your School Counsellor if you observe sustained changes in mood, participation, or social behaviour over two or more weeks. Do not attempt to explore sensitive personal matters without professional support.';
  if (q.includes('profes') || q.includes('consult') || q.includes('when should')) return 'You should consider requesting professional consultation when: your classroom concern has persisted for two weeks or more; your strategies have not improved the situation; the learner\'s wellbeing or participation is significantly affected; or you are unsure how to proceed safely. Use the Submit Request form in this portal: behaviour and wellbeing concerns go to the School Counsellor, learning concerns to the Learner Support Coordinator. Remember that a support request is the beginning of a collaborative process, not a referral for diagnosis.';
  if (q.includes('inclus') || q.includes('differenti') || q.includes('support need')) return 'Inclusive education begins with flexible instructional design. Offer tasks at different levels of challenge, vary how you present information (visual, oral, written), and allow varied ways to demonstrate learning. Peer learning pairs can support learners who benefit from additional scaffolding. Your Learner Support Coordinator can provide tailored inclusive education guidance for specific learners.';
  return 'Thank you for your question. The CHOLIS Teacher Support Assistant provides general, evidence-informed classroom guidance. For specific concerns about an individual learner, please use the Submit Request feature to reach your school\'s Counselling and Learner Support Department. Is there a particular classroom strategy or situation I can help you think through?';
}
