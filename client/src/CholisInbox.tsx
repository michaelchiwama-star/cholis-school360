import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, authHeaders } from './AuthContext';

interface InboxItem {
  id: string;
  type: 'learner_referral' | 'department_request';
  school_id: string;
  school_name: string;
  created_at: string;
  status: string;
  summary: string | null;
  cholis_response: string | null;
  cholis_assignee_id: string | null;
  assignee_name: string | null;
  // learner referral
  learner_ref?: string; classroom?: string; category?: string; routed_to?: string; school_status?: string;
  // department request
  topic?: string; details?: string; preferred_timing?: string | null; urgency?: string;
  requester_name?: string; requester_position?: string | null;
}

const STATUSES = ['New', 'In progress', 'Completed'];

/** Requests from all schools' Counselling and Learner Support Departments. */
export default function CholisInbox() {
  const { user } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<'all' | 'learner_referral' | 'department_request'>('all');
  const [status, setStatus] = useState<string>('open');
  const [school, setSchool] = useState('all');
  const [mine, setMine] = useState(false);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!user) return;
    fetch('/api/cholis/inbox', { headers: authHeaders(user) as any })
      .then(r => (r.ok ? r.json() : []))
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const update = async (it: InboxItem, patch: { status?: string; cholis_response?: string; assign_to_me?: boolean }) => {
    if (!user) return;
    setError('');
    const path = it.type === 'learner_referral' ? 'referrals' : 'department-requests';
    const res = await fetch(`/api/cholis/${path}/${it.id}`, { method: 'PATCH', headers: authHeaders(user) as any, body: JSON.stringify(patch) });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setError(e.error ?? 'The update could not be saved.');
    }
    setReplies(r => ({ ...r, [it.id]: '' }));
    load();
  };

  const schools = Array.from(new Map(items.map(i => [i.school_id, i.school_name])).entries());
  const shown = items.filter(i =>
    (type === 'all' || i.type === type) &&
    (status === 'all' || (status === 'open' ? i.status !== 'Completed' : i.status === status)) &&
    (school === 'all' || i.school_id === school) &&
    (!mine || i.cholis_assignee_id === user?.id)
  );
  const count = (pred: (i: InboxItem) => boolean) => items.filter(pred).length;
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const badge = (s: string) => <span className={`badge ${s === 'Completed' ? 'badge-completed' : s === 'In progress' ? 'badge-under-review' : 'badge-submitted'}`}>{s}</span>;

  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card navy"><div className="stat-value">{count(i => i.status === 'New')}</div><div className="stat-label">New</div></div>
        <div className="stat-card amber"><div className="stat-value">{count(i => i.status === 'In progress')}</div><div className="stat-label">In progress</div></div>
        <div className="stat-card green"><div className="stat-value">{count(i => i.status === 'Completed')}</div><div className="stat-label">Completed</div></div>
        <div className="stat-card"><div className="stat-value">{count(i => i.cholis_assignee_id === user?.id && i.status !== 'Completed')}</div><div className="stat-label">Picked up by me</div></div>
        <div className="stat-card"><div className="stat-value">{schools.length}</div><div className="stat-label">Schools</div></div>
      </div>

      <div className="card">
        <div className="card-title">CHOLIS Inbox — Requests from School Departments</div>
        <div className="alert alert-info">
          Requests sent by schools' Counselling and Learner Support Departments. Learner referrals show the learner reference, category and the department's note — never the teacher's observations. Your replies are shown to the school's department.
        </div>

        <div className="inbox-filters">
          <select className="form-control" value={type} onChange={e => setType(e.target.value as any)}>
            <option value="all">All types ({items.length})</option>
            <option value="learner_referral">Learner referrals ({count(i => i.type === 'learner_referral')})</option>
            <option value="department_request">Department requests ({count(i => i.type === 'department_request')})</option>
          </select>
          <select className="form-control" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="open">Open (not completed)</option>
            <option value="all">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-control" value={school} onChange={e => setSchool(e.target.value)}>
            <option value="all">All schools</option>
            {schools.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <label className="inbox-mine"><input type="checkbox" checked={mine} onChange={e => setMine(e.target.checked)} /> Picked up by me</label>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {loading ? <div className="spinner"/> : shown.length === 0 ? (
          <div className="empty-state"><div className="empty-state-icon">📭</div><p>Nothing here with these filters.</p></div>
        ) : shown.map(it => (
          <div key={`${it.type}-${it.id}`} className={`inbox-item ${it.status === 'New' ? 'is-new' : ''}`}>
            <div className="inbox-top">
              <div>
                <span className={`inbox-type ${it.type === 'learner_referral' ? 'learner' : 'dept'}`}>
                  {it.type === 'learner_referral' ? 'Learner referral' : 'Department request'}
                </span>
                <div className="inbox-title">
                  {it.type === 'learner_referral'
                    ? <>{it.category} — learner {it.learner_ref} ({it.classroom})</>
                    : <>{it.summary}</>}
                </div>
                <div className="inbox-meta">
                  <strong>{it.school_name}</strong>
                  {' · '}{it.type === 'learner_referral'
                    ? `from the ${it.routed_to ?? 'department'}`
                    : `${it.requester_name}${it.requester_position ? ` (${it.requester_position})` : ''}`}
                  {' · '}{fmt(it.created_at)}
                  {it.type === 'department_request' && <> · {it.topic} · {it.urgency}{it.preferred_timing ? ` · Timing: ${it.preferred_timing}` : ''}</>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {badge(it.status)}
                <div className="inbox-meta" style={{ marginTop: '0.3rem' }}>{it.assignee_name ? `Picked up by ${it.assignee_name}` : 'Not picked up'}</div>
              </div>
            </div>

            <div className="inbox-body">
              {it.type === 'learner_referral'
                ? <><strong>Department's note:</strong> {it.summary ?? '—'}</>
                : it.details}
            </div>
            {it.cholis_response && <div className="inbox-reply"><strong>Your reply to the school:</strong> {it.cholis_response}</div>}

            <div className="inbox-actions">
              {it.cholis_assignee_id !== user?.id && (
                <button className="btn btn-primary btn-sm" onClick={() => update(it, { assign_to_me: true })}>Pick up</button>
              )}
              <input className="form-control" maxLength={500} placeholder="Reply the school's department will see (optional)"
                value={replies[it.id] ?? ''} onChange={e => setReplies(r => ({ ...r, [it.id]: e.target.value }))} />
              <button className="btn btn-ghost btn-sm" disabled={!replies[it.id]?.trim()}
                onClick={() => update(it, { cholis_response: replies[it.id] })}>Send reply</button>
              {STATUSES.filter(s => s !== it.status && s !== 'New').map(s => (
                <button key={s} className="btn btn-ghost btn-sm" onClick={() => update(it, { status: s, ...(replies[it.id]?.trim() ? { cholis_response: replies[it.id] } : {}) })}>
                  Mark {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
