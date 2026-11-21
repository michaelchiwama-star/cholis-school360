import React, { useState, useEffect } from 'react';
import { useAuth, authHeaders } from '../AuthContext';

interface DashboardStats {
  total_requests: number;
  submitted: number;
  under_review: number;
  assigned: number;
  completed: number;
  closed: number;
  avg_response_days: number | null;
  parent_inquiries: number;
  cpd_activities: number;
  cpd_participants: number;
  cholis_referrals?: number;
  monthly_trend: { month: string; count: number }[];
  by_category: { category: string; count: number }[];
}

interface CpdActivity {
  id: string;
  title: string;
  facilitator: string;
  activity_date: string;
  participants: number;
  notes: string;
}

export default function LeaderPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [cpd, setCpd] = useState<CpdActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'trends' | 'cpd' | 'report'>('overview');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch('/api/dashboard', { headers: authHeaders(user) as any }).then(r => r.json()),
      fetch('/api/dashboard/cpd', { headers: authHeaders(user) as any }).then(r => r.json()),
    ]).then(([s, c]) => {
      setStats(s);
      setCpd(c);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const fmtMonth = (ym: string) => {
    const [y, m] = ym.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };

  const printReport = () => window.print();

  if (loading) return <div className="spinner"/>;
  if (!stats) return <div className="alert alert-danger">Unable to load dashboard data.</div>;

  const completionRate = stats.total_requests > 0
    ? Math.round((stats.completed / stats.total_requests) * 100)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="page-title">Leadership Dashboard</h1>
            <p className="page-subtitle">{user?.school_name} · Aggregate Service Statistics</p>
          </div>
          <button className="btn btn-secondary btn-sm no-print" onClick={printReport}>Print Report</button>
        </div>
      </div>

      <div className="alert alert-info no-print" style={{ marginBottom: '1.25rem' }}>
        This dashboard shows aggregate service statistics only. Individual learner records, teacher observations, and professional case notes are not accessible from this view.
      </div>

      <div className="nav-tabs no-print">
        {(['overview', 'trends', 'cpd', 'report'] as const).map(t => (
          <button key={t} className={`nav-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Overview' : t === 'trends' ? 'Monthly Trends' : t === 'cpd' ? 'CPD Activities' : 'Monthly Report'}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {(tab === 'overview' || tab === 'report') && (
        <>
          <div className="stat-grid">
            <div className="stat-card navy">
              <div className="stat-value">{stats.total_requests}</div>
              <div className="stat-label">Total Requests</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.submitted}</div>
              <div className="stat-label">Awaiting Review</div>
            </div>
            <div className="stat-card amber">
              <div className="stat-value">{stats.under_review + stats.assigned}</div>
              <div className="stat-label">In Progress</div>
            </div>
            <div className="stat-card green">
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{completionRate}%</div>
              <div className="stat-label">Completion Rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.avg_response_days != null ? `${stats.avg_response_days}d` : '—'}</div>
              <div className="stat-label">Avg Response Time</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.parent_inquiries}</div>
              <div className="stat-label">Parent Engagements</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.cpd_activities}</div>
              <div className="stat-label">CPD Activities</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.cholis_referrals ?? 0}</div>
              <div className="stat-label">Referred to CHOLIS</div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Requests by Support Category</div>
            {stats.by_category.length === 0 ? <p style={{ fontSize: '0.87rem', color: '#5a6a72' }}>No data yet.</p> : (
              <div>
                {stats.by_category.map(c => {
                  const pct = stats.total_requests > 0 ? Math.round((c.count / stats.total_requests) * 100) : 0;
                  return (
                    <div key={c.category} style={{ marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', marginBottom: '3px' }}>
                        <span>{c.category}</span>
                        <span style={{ color: '#5a6a72' }}>{c.count} request{c.count !== 1 ? 's' : ''} ({pct}%)</span>
                      </div>
                      <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#57872F', borderRadius: '4px' }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {tab === 'report' && (
            <div className="card">
              <div className="card-title">Monthly Activity Report — {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</div>
              <p style={{ fontSize: '0.87rem', marginBottom: '0.75rem' }}>School: <strong>{user?.school_name}</strong></p>
              <p style={{ fontSize: '0.87rem', marginBottom: '0.75rem' }}>Prepared by: CHOLIS School360 · {new Date().toLocaleDateString('en-GB')}</p>
              <hr className="divider"/>
              <p style={{ fontSize: '0.85rem', color: '#5a6a72', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                This report presents aggregate service activity statistics. It does not include individual learner records or confidential case information. Activity counts reflect administrative service operations and should not be interpreted as evidence of individual learner outcomes.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.87rem' }}>
                <div>Total support requests received: <strong>{stats.total_requests}</strong></div>
                <div>Requests completed: <strong>{stats.completed}</strong></div>
                <div>Requests in progress: <strong>{stats.under_review + stats.assigned}</strong></div>
                <div>Completion rate: <strong>{completionRate}%</strong></div>
                <div>Average administrative response: <strong>{stats.avg_response_days != null ? `${stats.avg_response_days} days` : 'Not yet available'}</strong></div>
                <div>Parent engagements: <strong>{stats.parent_inquiries}</strong></div>
                <div>CPD sessions delivered: <strong>{stats.cpd_activities}</strong></div>
                <div>CPD participants: <strong>{stats.cpd_participants}</strong></div>
                <div>Cases where the department requested CHOLIS support: <strong>{stats.cholis_referrals ?? 0}</strong></div>
              </div>
            </div>
          )}
        </>
      )}

      {/* MONTHLY TRENDS */}
      {tab === 'trends' && (
        <div className="card">
          <div className="card-title">Monthly Request Volume</div>
          {stats.monthly_trend.length === 0 ? (
            <div className="empty-state"><p>No trend data available yet.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Month</th><th>Requests Submitted</th></tr></thead>
                <tbody>
                  {[...stats.monthly_trend].reverse().map(t => (
                    <tr key={t.month}>
                      <td>{fmtMonth(t.month)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ height: '14px', width: `${Math.max(t.count * 20, 4)}px`, background: '#57872F', borderRadius: '3px' }}/>
                          <span>{t.count}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* CPD */}
      {tab === 'cpd' && (
        <div className="card">
          <div className="card-title">Professional Development Activities</div>
          {cpd.length === 0 ? (
            <div className="empty-state"><p>No CPD activities recorded yet.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>Title</th><th>Facilitator</th><th>Participants</th><th>Notes</th></tr></thead>
                <tbody>
                  {cpd.map(c => (
                    <tr key={c.id}>
                      <td>{fmt(c.activity_date)}</td>
                      <td><strong>{c.title}</strong></td>
                      <td>{c.facilitator}</td>
                      <td>{c.participants}</td>
                      <td style={{ fontSize: '0.8rem', color: '#5a6a72' }}>{c.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
