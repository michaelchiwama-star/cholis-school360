import React, { useState, useEffect } from 'react';
import { useAuth, authHeaders } from '../AuthContext';
import ResourceCards from '../ResourceCards';
import AssistantPanel from '../AssistantPanel';
import { TEACHER_RESOURCES } from '../resources';

const CATEGORIES = [
  'Learning difficulties',
  'Classroom behaviour',
  'Emotional wellbeing',
  'Peer relationships',
  'Attendance',
  'Inclusive education support',
  'Other',
];

interface SupportRequest {
  id: string;
  learner_ref: string;
  classroom: string;
  category: string;
  observations: string;
  status: string;
  routed_to: string | null;
  submitted_at: string;
  updated_at: string;
}

type Tab = 'submit' | 'my-requests' | 'resources' | 'assistant';

export default function TeacherPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('my-requests');
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);

  // Form state
  const [form, setForm] = useState({
    learner_ref: '', classroom: '', category: CATEGORIES[0], observations: '', routed_to: '',
  });
  const [routing, setRouting] = useState<{ routing: Record<string, string | null>; roles: string[]; staff: { name: string; position: string }[] } | null>(null);

  // Who in the school's Counselling and Learner Support Department receives each kind of request
  useEffect(() => {
    if (!user) return;
    fetch('/api/requests/routing', { headers: authHeaders(user) as any })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d) return;
        setRouting(d);
        setForm(f => ({ ...f, routed_to: f.routed_to || (d.routing[f.category] ?? '') }));
      })
      .catch(() => {});
  }, [user]);

  const chooseCategory = (category: string) =>
    setForm(f => ({ ...f, category, routed_to: routing?.routing[category] ?? '' }));

  const staffFor = (role: string) => routing?.staff.find(s => s.position === role)?.name;
  const [formError, setFormError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // AI assistant state

  useEffect(() => {
    if (!user) return;
    fetch('/api/requests', { headers: authHeaders(user) as any })
      .then(r => r.json())
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoadingReqs(false));
  }, [user, submitSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.learner_ref.trim() || !form.classroom.trim() || !form.observations.trim()) {
      setFormError('Please complete all fields.');
      return;
    }
    if (!form.routed_to) {
      setFormError('Please choose who in your Counselling and Learner Support Department should receive this request.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: authHeaders(user!) as any,
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        setFormError(err.error ?? 'Submission failed.');
        return;
      }
      setForm({ learner_ref: '', classroom: '', category: CATEGORIES[0], observations: '', routed_to: routing?.routing[CATEGORIES[0]] ?? '' });
      setSubmitSuccess(s => !s);
      setTab('my-requests');
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Submitted': 'badge-submitted',
      'Under Review': 'badge-under-review',
      'Assigned': 'badge-assigned',
      'Completed': 'badge-completed',
      'Closed': 'badge-closed',
    };
    return <span className={`badge ${map[status] ?? 'badge-submitted'}`}>{status}</span>;
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Teacher Portal</h1>
        <p className="page-subtitle">Welcome, {user?.name} · {user?.school_name}</p>
      </div>

      <div className="nav-tabs">
        {([['my-requests', 'My Requests'], ['submit', 'Submit Request'], ['resources', 'Classroom Resources'], ['assistant', 'AI Support Assistant']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} className={`nav-tab ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* MY REQUESTS */}
      {tab === 'my-requests' && (
        <div className="card">
          <div className="card-title">My Support Requests</div>
          {loadingReqs ? <div className="spinner"/> :
           requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p>No support requests submitted yet.</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setTab('submit')}>Submit a Request</button>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Class</th>
                    <th>Category</th>
                    <th>Sent to</th>
                    <th>Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id}>
                      <td><strong>{r.learner_ref}</strong></td>
                      <td>{r.classroom}</td>
                      <td>{r.category}</td>
                      <td>{r.routed_to ?? '—'}</td>
                      <td>{formatDate(r.submitted_at)}</td>
                      <td>{statusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBMIT FORM */}
      {tab === 'submit' && (
        <div className="card">
          <div className="card-title">Submit a Learner Support Request</div>
          <div className="alert alert-info">
            <div>
              <strong>Privacy Notice:</strong> Use the fictional learner reference ID only. Do not enter the learner's real name, diagnoses, clinical history, safeguarding disclosures, or unnecessary personal information. Record only general classroom observations relevant to the support category.
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="school">School</label>
              <input id="school" className="form-control" value={user?.school_name ?? ''} disabled />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="learner_ref">Learner Reference ID *</label>
              <input
                id="learner_ref"
                className="form-control"
                placeholder="e.g. LRN-2024-099"
                value={form.learner_ref}
                onChange={e => setForm(f => ({ ...f, learner_ref: e.target.value }))}
              />
              <div className="form-hint">Use the school's fictional reference code, not the learner's real name.</div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="classroom">Classroom / Grade *</label>
              <input
                id="classroom"
                className="form-control"
                placeholder="e.g. Grade 5A"
                value={form.classroom}
                onChange={e => setForm(f => ({ ...f, classroom: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="category">Support Category *</label>
              <select
                id="category"
                className="form-control"
                value={form.category}
                onChange={e => chooseCategory(e.target.value)}
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="routed_to">Send request to *</label>
              <select
                id="routed_to"
                className="form-control"
                value={form.routed_to}
                onChange={e => setForm(f => ({ ...f, routed_to: e.target.value }))}
              >
                <option value="">— Choose who should receive this —</option>
                {(routing?.roles ?? ['School Counsellor', 'Learner Support Coordinator']).map(r => (
                  <option key={r} value={r}>{r}{staffFor(r) ? ` — ${staffFor(r)}` : ''}</option>
                ))}
              </select>
              <div className="form-hint">
                Requests go to your school's Counselling and Learner Support Department. Behaviour, emotional wellbeing and peer relationships go to the School Counsellor; learning, attendance and inclusive education go to the Learner Support Coordinator. The department contacts CHOLIS if extra support is needed. Safeguarding concerns must go to your Child Protection Focal Person today, not through this form.
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="observations">Classroom Observations *</label>
              <textarea
                id="observations"
                className="form-control"
                placeholder="Describe the classroom behaviours or difficulties you have observed. Do not include clinical opinions, diagnoses, or personal background information."
                value={form.observations}
                onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                rows={5}
              />
            </div>
            {formError && <div className="alert alert-danger">{formError}</div>}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setForm({ learner_ref: '', classroom: '', category: CATEGORIES[0], observations: '', routed_to: routing?.routing[CATEGORIES[0]] ?? '' })}>
                Clear
              </button>
            </div>
          </form>
        </div>
      )}

      {/* RESOURCES */}
      {tab === 'resources' && <ClassroomResources />}

      {/* AI ASSISTANT */}
      {tab === 'assistant' && <AssistantPanel audience="teacher" />}
    </div>
  );
}

function ClassroomResources() {
  return (
    <div>
      <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
        Quick, practical tips you can use in your classroom, approved by CHOLIS. They draw on the CHOLIS Classroom Support Guide and the Ministry of Education Catch Up / Teaching at the Right Level guides. If a learner needs more help, use Submit Request to reach your School Counsellor or Learner Support Coordinator.
      </div>
      <ResourceCards cards={TEACHER_RESOURCES} />
    </div>
  );
}
