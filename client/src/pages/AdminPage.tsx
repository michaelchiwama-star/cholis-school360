import React, { useState, useEffect } from 'react';
import { useAuth, authHeaders } from '../AuthContext';
import CholisInbox from '../CholisInbox';
import ParentEnquiriesPanel from '../ParentEnquiriesPanel';

interface ConsultationInquiry {
  id: string;
  school_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  district: string | null;
  province: string | null;
  message: string | null;
  inquiry_type: string;
  status: string;
  submitted_at: string;
}

interface ParentInquiry {
  id: string;
  school_name: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  message: string;
  status: string;
  submitted_at: string;
}

interface SchoolReferral {
  id: string;
  school_name: string;
  learner_ref: string;
  classroom: string;
  category: string;
  routed_to: string | null;
  status: string;
  cholis_requested_at: string;
  cholis_note: string | null;
}

interface DeptRequest {
  id: string;
  school_name: string;
  requester_name: string;
  requester_position: string | null;
  topic: string;
  summary: string;
  details: string;
  preferred_timing: string | null;
  urgency: string;
  status: string;
  cholis_response: string | null;
  created_at: string;
}

export default function AdminPage() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<ConsultationInquiry[]>([]);
  const [parents, setParents] = useState<ParentInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'inbox' | 'consultations' | 'parents' | 'stats'>('inbox');
  const [deptRequests, setDeptRequests] = useState<DeptRequest[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const loadDept = () => {
    if (!user) return;
    fetch('/api/department-requests', { headers: authHeaders(user) as any })
      .then(r => (r.ok ? r.json() : [])).then(setDeptRequests).catch(() => {});
  };
  const updateDept = async (id: string, patch: { status?: string; cholis_response?: string }) => {
    if (!user) return;
    await fetch(`/api/department-requests/${id}`, { method: 'PATCH', headers: authHeaders(user) as any, body: JSON.stringify(patch) });
    loadDept();
  };
  const [referrals, setReferrals] = useState<SchoolReferral[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch('/api/public/inquiries', { headers: authHeaders(user) as any }).then(r => r.json()),
      fetch('/api/dashboard', { headers: authHeaders(user) as any }).then(r => r.json()),
      fetch('/api/dashboard/cholis-referrals', { headers: authHeaders(user) as any }).then(r => (r.ok ? r.json() : [])),
      fetch('/api/department-requests', { headers: authHeaders(user) as any }).then(r => (r.ok ? r.json() : [])),
    ]).then(([inq, s, refs, dept]) => {
      setDeptRequests(Array.isArray(dept) ? dept : []);
      setReferrals(Array.isArray(refs) ? refs : []);
      setConsultations(inq.consultations ?? []);
      setParents(inq.parents ?? []);
      setStats(s);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">CHOLIS Administrator</h1>
        <p className="page-subtitle">{user?.name} · CHOLIS Administration</p>
      </div>

      {/* Quick stats */}
      <div className="stat-grid">
        <div className="stat-card navy">
          <div className="stat-value">{deptRequests.filter(d => d.status !== 'Completed').length}</div>
          <div className="stat-label">Open Department Requests</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-value">{referrals.length}</div>
          <div className="stat-label">School Referrals to CHOLIS</div>
        </div>
        <div className="stat-card navy">
          <div className="stat-value">{consultations.filter(c => c.status === 'New').length}</div>
          <div className="stat-label">New Inquiries</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{consultations.length}</div>
          <div className="stat-label">Total Consultations</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{parents.length}</div>
          <div className="stat-label">Parent Engagements</div>
        </div>
        {stats && (
          <div className="stat-card">
            <div className="stat-value">{stats.total_requests}</div>
            <div className="stat-label">Platform Requests</div>
          </div>
        )}
      </div>

      <div className="nav-tabs">
        <button className={`nav-tab ${tab === 'inbox' ? 'active' : ''}`} onClick={() => setTab('inbox')}>
          CHOLIS Inbox ({deptRequests.filter(d => d.status !== 'Completed').length + referrals.length})
        </button>
        <button className={`nav-tab ${tab === 'consultations' ? 'active' : ''}`} onClick={() => setTab('consultations')}>
          School Consultation Inquiries ({consultations.length})
        </button>
        <button className={`nav-tab ${tab === 'parents' ? 'active' : ''}`} onClick={() => setTab('parents')}>
          Parent Enquiries ({parents.length})
        </button>
        <button className={`nav-tab ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>
          Platform Statistics
        </button>
      </div>

      {loading && <div className="spinner"/>}

      {/* CHOLIS INBOX */}
      {!loading && tab === 'inbox' && <CholisInbox />}

      {/* CONSULTATIONS */}
      {!loading && tab === 'consultations' && (
        <div className="card">
          <div className="card-title">School Consultation Inquiries</div>
          {consultations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📬</div>
              <p>No consultation inquiries received yet.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>School</th>
                    <th>Contact</th>
                    <th>District</th>
                    <th>Type</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map(c => (
                    <tr key={c.id}>
                      <td>{fmt(c.submitted_at)}</td>
                      <td><strong>{c.school_name}</strong></td>
                      <td>
                        {c.contact_name}<br/>
                        <span style={{ fontSize: '0.78rem', color: '#5a6a72' }}>{c.contact_email}</span>
                      </td>
                      <td>{c.district ?? '—'}{c.province ? `, ${c.province}` : ''}</td>
                      <td>{c.inquiry_type}</td>
                      <td><span className={`badge ${c.status === 'New' ? 'badge-submitted' : 'badge-completed'}`}>{c.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PARENT ENQUIRIES */}
      {!loading && tab === 'parents' && <ParentEnquiriesPanel audience="cholis" />}

      {/* STATS */}
      {!loading && tab === 'stats' && stats && (
        <div>
          <div className="stat-grid">
            <div className="stat-card navy"><div className="stat-value">{stats.total_requests}</div><div className="stat-label">Total Requests</div></div>
            <div className="stat-card green"><div className="stat-value">{stats.completed}</div><div className="stat-label">Completed</div></div>
            <div className="stat-card"><div className="stat-value">{stats.cpd_activities}</div><div className="stat-label">CPD Sessions</div></div>
            <div className="stat-card"><div className="stat-value">{stats.cpd_participants}</div><div className="stat-label">CPD Participants</div></div>
          </div>
          <div className="card">
            <div className="card-title">Requests by Category (All Schools)</div>
            {stats.by_category.map((c: any) => {
              const pct = stats.total_requests > 0 ? Math.round((c.count / stats.total_requests) * 100) : 0;
              return (
                <div key={c.category} style={{ marginBottom: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '3px' }}>
                    <span>{c.category}</span>
                    <span style={{ color: '#5a6a72' }}>{c.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: '#002D43', borderRadius: '4px' }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
