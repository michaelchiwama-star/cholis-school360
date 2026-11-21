import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, authHeaders } from '../AuthContext';
import AssistantPanel from '../AssistantPanel';
import DepartmentRequestPanel from '../DepartmentRequestPanel';
import ParentEnquiriesPanel from '../ParentEnquiriesPanel';

interface SupportRequest {
  id: string;
  teacher_name: string;
  learner_ref: string;
  classroom: string;
  category: string;
  observations: string;
  status: string;
  routed_to: string | null;
  assigned_to: string | null;
  assigned_name: string | null;
  cholis_requested_at: string | null;
  cholis_note: string | null;
  cholis_status?: string | null;
  cholis_response?: string | null;
  cholis_assignee_name?: string | null;
  submitted_at: string;
  updated_at: string;
}

interface Activity {
  id: string;
  actor_name: string;
  action: string;
  note: string | null;
  created_at: string;
}

interface Professional {
  id: string;
  name: string;
  position: string | null;
}

const DEPARTMENT_ROLES = ['School Counsellor', 'Learner Support Coordinator'];

const STATUS_OPTIONS = ['Submitted', 'Under Review', 'Assigned', 'Completed', 'Closed'];

export default function ProfessionalPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [view, setView] = useState<'requests' | 'parents' | 'cholis' | 'assistant'>('requests');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRoute, setFilterRoute] = useState<string>(user?.position && DEPARTMENT_ROLES.includes(user.position) ? user.position : 'all');
  const [cholisNote, setCholisNote] = useState('');
  const [actionError, setActionError] = useState('');
  const [updateNote, setUpdateNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [parentDraft, setParentDraft] = useState('');
  const [showDraft, setShowDraft] = useState(false);

  const loadRequests = useCallback(() => {
    if (!user) return;
    setLoading(true);
    fetch('/api/requests', { headers: authHeaders(user) as any })
      .then(r => r.json())
      .then(setRequests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/dashboard/professionals', { headers: authHeaders(user) as any })
      .then(r => r.json())
      .then(setProfessionals)
      .catch(() => {});
  }, [user]);

  const selectRequest = (req: SupportRequest) => {
    setSelectedId(req.id);
    setUpdateNote('');
    setCholisNote('');
    setActionError('');
    setShowDraft(false);
    if (!user) return;
    fetch(`/api/requests/${req.id}/activities`, { headers: authHeaders(user) as any })
      .then(r => r.json())
      .then(setActivities)
      .catch(() => {});
  };

  const updateRequest = async (id: string, patch: Partial<{ status: string; assigned_to: string | null; note: string; routed_to: string; request_cholis: boolean; cholis_note: string }>) => {
    if (!user) return;
    setUpdating(true);
    setActionError('');
    const res = await fetch(`/api/requests/${id}`, {
      method: 'PATCH',
      headers: authHeaders(user) as any,
      body: JSON.stringify({ ...patch, note: updateNote || undefined }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setActionError(err.error ?? 'The update could not be saved.');
    }
    setUpdateNote('');
    if (patch.request_cholis && res.ok) setCholisNote('');
    loadRequests();
    // Reload activities
    fetch(`/api/requests/${id}/activities`, { headers: authHeaders(user) as any })
      .then(r => r.json())
      .then(setActivities)
      .catch(() => {})
      .finally(() => setUpdating(false));
  };

  const selected = requests.find(r => r.id === selectedId) ?? null;

  const byRoute = filterRoute === 'all' ? requests : requests.filter(r => r.routed_to === filterRoute);
  const filtered = filterStatus === 'all' ? byRoute : byRoute.filter(r => r.status === filterStatus);

  const counts = {
    submitted: byRoute.filter(r => r.status === 'Submitted').length,
    under_review: byRoute.filter(r => r.status === 'Under Review').length,
    assigned: byRoute.filter(r => r.status === 'Assigned').length,
    completed: byRoute.filter(r => r.status === 'Completed').length,
    cholis: byRoute.filter(r => r.cholis_requested_at).length,
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { 'Submitted': 'badge-submitted', 'Under Review': 'badge-under-review', 'Assigned': 'badge-assigned', 'Completed': 'badge-completed', 'Closed': 'badge-closed' };
    return <span className={`badge ${map[s] ?? 'badge-submitted'}`}>{s}</span>;
  };
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtFull = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const generateDraft = (req: SupportRequest) => {
    setParentDraft(
      `Dear Parent/Guardian,\n\nWe are writing to let you know that the school's support services have been in contact with your child's teacher regarding some observations made in the classroom.\n\nOur Counselling and Learner Support Department has reviewed the situation (Reference: ${req.learner_ref}). We would like to invite you to a brief consultation at your convenience to discuss how we can work together to support your child's progress.\n\nPlease contact us at the school to arrange a suitable time.\n\nThis communication has been prepared by the ${req.routed_to ?? 'Counselling and Learner Support Department'} in collaboration with ${req.teacher_name}.\n\nKind regards,\n${user?.name}\n${req.routed_to ?? 'Counselling and Learner Support Department'}\n${user?.school_name}`
    );
    setShowDraft(true);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Counselling &amp; Learner Support Department</h1>
        <p className="page-subtitle">{user?.name}{user?.position ? ` · ${user.position}` : ''} · {user?.school_name}</p>
      </div>

      <div className="nav-tabs">
        <button className={`nav-tab ${view === 'requests' ? 'active' : ''}`} onClick={() => setView('requests')}>Support Requests</button>
        <button className={`nav-tab ${view === 'parents' ? 'active' : ''}`} onClick={() => setView('parents')}>Parent Enquiries</button>
        <button className={`nav-tab ${view === 'cholis' ? 'active' : ''}`} onClick={() => setView('cholis')}>Request CHOLIS Support</button>
        <button className={`nav-tab ${view === 'assistant' ? 'active' : ''}`} onClick={() => setView('assistant')}>AI Support Assistant</button>
      </div>

      {view === 'assistant' && <AssistantPanel audience="department" />}
      {view === 'cholis' && <DepartmentRequestPanel />}
      {view === 'parents' && <ParentEnquiriesPanel audience="department" />}

      {view === 'requests' && (<>
      {/* Summary stats */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-value">{counts.submitted}</div>
          <div className="stat-label">New Requests</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-value">{counts.under_review}</div>
          <div className="stat-label">Under Review</div>
        </div>
        <div className="stat-card" style={{ borderTopColor: '#7c3aed' }}>
          <div className="stat-value">{counts.assigned}</div>
          <div className="stat-label">Assigned</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{counts.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card navy">
          <div className="stat-value">{byRoute.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-value">{counts.cholis}</div>
          <div className="stat-label">Referred to CHOLIS</div>
        </div>
      </div>

      <div className="sidebar-layout">
        {/* Request list */}
        <div>
          <div className="card" style={{ padding: '0.75rem' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <select className="form-control" value={filterRoute} onChange={e => setFilterRoute(e.target.value)} style={{ fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                <option value="all">Whole department ({requests.length})</option>
                {DEPARTMENT_ROLES.map(d => (
                  <option key={d} value={d}>Sent to {d} ({requests.filter(r => r.routed_to === d).length})</option>
                ))}
              </select>
              <select className="form-control" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: '0.82rem' }}>
                <option value="all">All statuses ({byRoute.length})</option>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s} ({byRoute.filter(r => r.status === s).length})</option>
                ))}
              </select>
            </div>
            {loading ? <div className="spinner"/> : filtered.length === 0 ? (
              <div className="empty-state"><p>No requests.</p></div>
            ) : filtered.map(r => (
              <button
                key={r.id}
                onClick={() => selectRequest(r)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '0.65rem 0.75rem',
                  border: 'none', background: selectedId === r.id ? '#e8f4df' : 'transparent',
                  borderRadius: '6px', cursor: 'pointer', marginBottom: '2px', fontFamily: 'inherit',
                  borderLeft: selectedId === r.id ? '3px solid #57872F' : '3px solid transparent',
                }}
              >
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#002D43' }}>{r.learner_ref}</div>
                <div style={{ fontSize: '0.75rem', color: '#5a6a72' }}>{r.classroom} · {r.category}</div>
                <div style={{ fontSize: '0.72rem', color: '#5a6a72' }}>To: {r.routed_to ?? '—'}{r.cholis_requested_at ? ' · CHOLIS requested' : ''}</div>
                <div style={{ marginTop: '3px' }}>{statusBadge(r.status)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Request detail */}
        <div>
          {!selected ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-state-icon">📂</div>
                <p>Select a request from the list to view details.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="card">
                <div className="card-title">Request Detail — {selected.learner_ref}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', fontSize: '0.87rem' }}>
                  <div><strong>Classroom:</strong> {selected.classroom}</div>
                  <div><strong>Category:</strong> {selected.category}</div>
                  <div><strong>Sent to:</strong> {selected.routed_to ?? '—'}</div>
                  <div><strong>Teacher:</strong> {selected.teacher_name}</div>
                  <div><strong>Status:</strong> {statusBadge(selected.status)}</div>
                  <div><strong>Submitted:</strong> {fmt(selected.submitted_at)}</div>
                  <div><strong>Last updated:</strong> {fmt(selected.updated_at)}</div>
                  {selected.assigned_name && <div><strong>Assigned to:</strong> {selected.assigned_name}</div>}
                </div>
                <div className="form-label">Classroom Observations (Teacher Report)</div>
                <div style={{ background: '#f7f8fa', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '0.75rem', fontSize: '0.87rem', color: '#333', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                  {selected.observations}
                </div>

                {/* Update status */}
                <div className="divider"/>
                <div className="form-group">
                  <label className="form-label">Update Status</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {STATUS_OPTIONS.filter(s => s !== selected.status).map(s => (
                      <button key={s} className="btn btn-ghost btn-sm" disabled={updating}
                        onClick={() => updateRequest(selected.id, { status: s })}>
                        → {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Redirect within the department</label>
                  <select className="form-control" style={{ maxWidth: '380px' }} disabled={updating}
                    value={selected.routed_to ?? ''}
                    onChange={e => e.target.value && updateRequest(selected.id, { routed_to: e.target.value })}>
                    {!selected.routed_to && <option value="">— Not set —</option>}
                    {DEPARTMENT_ROLES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Assign to staff member</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select className="form-control" style={{ maxWidth: '380px' }}
                      value={selected.assigned_to ?? ''}
                      onChange={e => updateRequest(selected.id, { assigned_to: e.target.value || null })}>
                      <option value="">— Unassigned —</option>
                      {professionals.map(p => <option key={p.id} value={p.id}>{p.name}{p.position ? ` (${p.position})` : ''}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Add a Note (optional)</label>
                  <input type="text" className="form-control" placeholder="Brief internal note for the activity log…"
                    value={updateNote} onChange={e => setUpdateNote(e.target.value)} />
                </div>

                {actionError && <div className="alert alert-danger">{actionError}</div>}

                <div className="divider"/>
                <div className="form-group">
                  <label className="form-label">Request additional support from CHOLIS</label>
                  {selected.cholis_requested_at ? (
                    <div className="alert alert-info">
                      <div>
                        CHOLIS support requested on {fmt(selected.cholis_requested_at)} · <strong>{selected.cholis_status ?? 'New'}</strong>
                        {selected.cholis_assignee_name ? ` · picked up by ${selected.cholis_assignee_name}` : ' · waiting for CHOLIS'}
                        {selected.cholis_note && <div style={{ marginTop: '0.3rem' }}><em>Our note: {selected.cholis_note}</em></div>}
                        {selected.cholis_response && <div style={{ marginTop: '0.3rem', color: '#3b6b1c' }}><strong>CHOLIS reply:</strong> {selected.cholis_response}</div>}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="form-hint" style={{ marginBottom: '0.4rem' }}>
                        Use this when the department needs extra or specialist help. CHOLIS sees the learner reference, category and your note — not the teacher's observations. Do not include names or safeguarding details.
                      </div>
                      <input type="text" className="form-control" maxLength={300} placeholder="What support does the department need from CHOLIS?"
                        value={cholisNote} onChange={e => setCholisNote(e.target.value)} />
                      <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} disabled={updating || !cholisNote.trim()}
                        onClick={() => updateRequest(selected.id, { request_cholis: true, cholis_note: cholisNote })}>
                        Request CHOLIS support
                      </button>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => generateDraft(selected)}>
                    Prepare Parent Communication Draft
                  </button>
                </div>
              </div>

              {/* Parent communication draft */}
              {showDraft && (
                <div className="card">
                  <div className="card-title">Parent Communication Draft</div>
                  <div className="alert alert-warning" style={{ marginBottom: '0.75rem' }}>
                    This draft must be reviewed and approved before sharing. Do not send automatically.
                  </div>
                  <textarea className="form-control" rows={12} value={parentDraft}
                    onChange={e => setParentDraft(e.target.value)} style={{ fontFamily: 'serif', fontSize: '0.9rem' }}/>
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowDraft(false)}>Close</button>
                    <span style={{ fontSize: '0.78rem', color: '#5a6a72', alignSelf: 'center' }}>Draft only — requires authorisation before use</span>
                  </div>
                </div>
              )}

              {/* Activity log */}
              <div className="card">
                <div className="card-title">Activity History</div>
                {activities.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#5a6a72' }}>No activity recorded yet.</p>
                ) : (
                  <ul className="activity-log">
                    {activities.map(a => (
                      <li key={a.id} className="activity-item">
                        <div className="activity-dot"/>
                        <div>
                          <div><strong>{a.actor_name}</strong> — {a.action}</div>
                          {a.note && <div style={{ color: '#5a6a72', fontSize: '0.8rem', marginTop: '2px' }}>{a.note}</div>}
                          <div className="activity-time">{fmtFull(a.created_at)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      </>)}
    </div>
  );
}
