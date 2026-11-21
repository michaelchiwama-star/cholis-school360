import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth, authHeaders } from './AuthContext';

interface Note { id: string; title: string; body: string | null; read_at: string | null; created_at: string; school_name: string | null; }

/** Bell with unread count; checks for new notifications every minute. */
export default function NotificationBell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Note[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    if (!user) return;
    fetch('/api/notifications', { headers: authHeaders(user) as any })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d) { setUnread(d.unread); setItems(d.items); } })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [load]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const markAll = async () => {
    if (!user) return;
    await fetch('/api/notifications/read-all', { method: 'POST', headers: authHeaders(user) as any });
    load();
  };
  const markOne = async (id: string) => {
    if (!user) return;
    await fetch(`/api/notifications/${id}/read`, { method: 'POST', headers: authHeaders(user) as any });
    load();
  };
  const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="notif" ref={boxRef}>
      <button type="button" className="notif-button" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => setOpen(o => !o)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && <span className="notif-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <strong>Notifications</strong>
            {unread > 0 && <button type="button" className="notif-link" onClick={markAll}>Mark all as read</button>}
          </div>
          {items.length === 0 ? (
            <p className="notif-empty">No notifications yet.</p>
          ) : items.map(n => (
            <button type="button" key={n.id} className={`notif-item ${n.read_at ? '' : 'unread'}`} onClick={() => !n.read_at && markOne(n.id)}>
              <div className="notif-title">{n.title}</div>
              {n.body && <div className="notif-body">{n.body}</div>}
              <div className="notif-time">{when(n.created_at)}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
