import { useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface Enquiry {
  id: string;
  school_name: string | null;
  route_to: 'school' | 'cholis';
  topic: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  message: string | null;
  status: string;
  submitted_at: string;
  handled_by_name: string | null;
  masked?: boolean;
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Parent and guardian enquiries.
 *  audience 'department': enquiries parents sent to this school's department.
 *  audience 'cholis': enquiries sent to CHOLIS, plus a privacy-safe view of those sent to schools. */
export default function ParentEnquiriesPanel({ audience }: { audience: 'department' | 'cholis' }) {
  const { user } = useAuth();
  const token = user?.token;
  const [items, setItems] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'open' | 'all'>('open');

  const load = async () => {
    try {
      const r = await fetch('/api/parent-enquiries', { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error();
      setItems(await r.json());
      setError('');
    } catch {
      setError('Could not load parent enquiries.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const r = await fetch(`/api/parent-enquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (r.ok) load(); else setError('Could not update the enquiry.');
  };

  const mine = audience === 'cholis' ? items.filter(i => i.route_to !== 'school') : items;
  const toSchools = audience === 'cholis' ? items.filter(i => i.route_to === 'school') : [];
  const shown = filter === 'open' ? mine.filter(i => i.status !== 'Closed') : mine;

  return (
    <div>
      <div className="card">
        <div className="card-title">
          {audience === 'department' ? 'Parent Enquiries to Our Department' : 'Parent Enquiries to CHOLIS'}
        </div>
        <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
          <div>
            {audience === 'department'
              ? 'Parents and guardians chose your department to respond. Please contact them to arrange a private conversation. Follow your school\'s safeguarding procedure if a message raises a concern about a child\'s safety.'
              : 'Parents sent these to CHOLIS, either because they preferred CHOLIS or because their child\'s school is not yet on School360.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <select className="form-control" style={{ maxWidth: '220px' }} value={filter} onChange={e => setFilter(e.target.value as 'open' | 'all')}>
            <option value="open">Open (not closed)</option>
            <option value="all">All enquiries</option>
          </select>
        </div>
        {loading && <p>Loading…</p>}
        {error && <div className="alert alert-danger">{error}</div>}
        {!loading && shown.length === 0 && (
          <div className="empty-state"><div className="empty-state-icon">💬</div><p>No parent enquiries here.</p></div>
        )}
        {shown.map(p => (
          <div key={p.id} className="parent-enquiry">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#002D43' }}>{p.topic ?? 'General enquiry'}</div>
                <div style={{ fontSize: '0.8rem', color: '#5a6a72' }}>
                  {fmt(p.submitted_at)}
                  {audience === 'cholis' && <> · {p.school_name ?? 'School not on School360'}</>}
                  {p.handled_by_name && <> · Last updated by {p.handled_by_name}</>}
                </div>
              </div>
              <span className={`badge ${p.status === 'New' ? 'badge-submitted' : p.status === 'Contacted' ? 'badge-under-review' : 'badge-closed'}`}>{p.status}</span>
            </div>
            <p style={{ margin: '0.6rem 0', fontSize: '0.9rem' }}>{p.message}</p>
            <div style={{ fontSize: '0.85rem' }}>
              <strong>{p.contact_name}</strong>
              {p.contact_phone && <> · {p.contact_phone}</>}
              {p.contact_email && <> · {p.contact_email}</>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
              {p.status !== 'Contacted' && p.status !== 'Closed' && (
                <button className="btn btn-primary btn-sm" onClick={() => setStatus(p.id, 'Contacted')}>Mark as contacted</button>
              )}
              {p.status !== 'Closed' && (
                <button className="btn btn-ghost btn-sm" onClick={() => setStatus(p.id, 'Closed')}>Close</button>
              )}
              {p.status === 'Closed' && (
                <button className="btn btn-ghost btn-sm" onClick={() => setStatus(p.id, 'New')}>Reopen</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {audience === 'cholis' && (
        <div className="card">
          <div className="card-title">Parent Enquiries Sent to Schools</div>
          <p style={{ fontSize: '0.85rem', color: '#5a6a72', marginBottom: '0.75rem' }}>
            These go to each school's Counselling and Learner Support Department. To protect families' privacy, CHOLIS sees only the school, topic and status.
          </p>
          {toSchools.length === 0 ? <p style={{ fontSize: '0.85rem' }}>None yet.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Date</th><th>School</th><th>Topic</th><th>Status</th></tr></thead>
                <tbody>
                  {toSchools.map(p => (
                    <tr key={p.id}><td>{fmt(p.submitted_at)}</td><td>{p.school_name}</td><td>{p.topic}</td>
                      <td><span className={`badge ${p.status === 'New' ? 'badge-submitted' : p.status === 'Contacted' ? 'badge-under-review' : 'badge-closed'}`}>{p.status}</span></td></tr>
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
