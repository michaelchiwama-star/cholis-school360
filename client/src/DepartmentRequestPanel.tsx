import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, authHeaders } from './AuthContext';

interface DeptRequest {
  id: string;
  topic: string;
  summary: string;
  details: string;
  preferred_timing: string | null;
  urgency: string;
  status: string;
  cholis_response: string | null;
  requester_name: string;
  requester_position: string | null;
  created_at: string;
}

const EMPTY = { topic: '', summary: '', details: '', preferred_timing: '', urgency: 'Routine' };

/** Department staff ask CHOLIS for department-level support (not about one learner). */
export default function DepartmentRequestPanel() {
  const { user } = useAuth();
  const [options, setOptions] = useState<{ topics: string[]; urgency: string[] }>({ topics: [], urgency: ['Routine'] });
  const [list, setList] = useState<DeptRequest[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    fetch('/api/department-requests', { headers: authHeaders(user) as any })
      .then(r => (r.ok ? r.json() : [])).then(setList).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/department-requests/options', { headers: authHeaders(user) as any })
      .then(r => r.json()).then(setOptions).catch(() => {});
    load();
  }, [user, load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setDone(false);
    if (!form.topic || !form.summary.trim() || !form.details.trim()) {
      setError('Please choose a topic and fill in the summary and details.');
      return;
    }
    setSending(true);
    try {
      const res = await fetch('/api/department-requests', {
        method: 'POST', headers: authHeaders(user!) as any, body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? 'The request could not be sent.'); return; }
      setForm(EMPTY); setDone(true); load();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const badge = (s: string) => <span className={`badge ${s === 'Completed' ? 'badge-completed' : s === 'In progress' ? 'badge-under-review' : 'badge-submitted'}`}>{s}</span>;

  return (
    <div>
      <div className="card">
        <div className="card-title">Request Support from CHOLIS</div>
        <div className="alert alert-info">
          <div>
            <p style={{ margin: '0 0 0.4rem' }}>
              <strong>Use this form to ask the Center for Holistic Schools Global (CHOLIS) for support for your department</strong>, such as staff training, supervision for counsellors and trainee fellows, classroom coaching, or Ubuntu materials.
            </p>
            <p style={{ margin: '0 0 0.4rem' }}>
              <strong>Need help with a specific learner?</strong> Open that learner's request under <strong>Support Requests</strong> and click <strong>"Request CHOLIS support"</strong> there.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Please do not include learner names or safeguarding details.</strong> Report any safeguarding concern to your school's Child Protection Focal Person today.
            </p>
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label" htmlFor="dr-topic">Type of support *</label>
            <select id="dr-topic" className="form-control" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}>
              <option value="">— Choose a topic —</option>
              {options.topics.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dr-summary">Short summary *</label>
            <input id="dr-summary" className="form-control" maxLength={120} placeholder="e.g. Positive discipline training for Grade 4–7 teachers"
              value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dr-details">Details *</label>
            <textarea id="dr-details" className="form-control" rows={4} maxLength={1500}
              placeholder="What do you need, for whom, and why? No learner names or personal details."
              value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="dr-timing">Preferred timing (optional)</label>
              <input id="dr-timing" className="form-control" maxLength={100} placeholder="e.g. Any Friday afternoon this term"
                value={form.preferred_timing} onChange={e => setForm(f => ({ ...f, preferred_timing: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dr-urgency">How soon?</label>
              <select id="dr-urgency" className="form-control" value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
                {options.urgency.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          {done && <div className="alert alert-success">Your request has been sent to CHOLIS. You can follow its progress below.</div>}
          <button type="submit" className="btn btn-primary" disabled={sending}>{sending ? 'Sending…' : 'Send to CHOLIS'}</button>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Our Department's Requests to CHOLIS</div>
        {list.length === 0 ? (
          <p style={{ fontSize: '0.87rem', color: '#5a6a72' }}>No requests sent yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sent</th><th>Topic</th><th>Summary</th><th>By</th><th>Status</th></tr></thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.id}>
                    <td>{fmt(r.created_at)}</td>
                    <td style={{ fontSize: '0.82rem' }}>{r.topic}</td>
                    <td style={{ fontSize: '0.84rem' }}>
                      <strong>{r.summary}</strong>
                      {r.cholis_response && <div style={{ color: '#3b6b1c', marginTop: '0.25rem' }}>CHOLIS: {r.cholis_response}</div>}
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{r.requester_name}{r.requester_position ? <><br/><span style={{ color: '#5a6a72' }}>{r.requester_position}</span></> : null}</td>
                    <td>{badge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
