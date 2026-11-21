import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface AuthUser {
  id: string;
  school_id: string;
  school_name: string;
  name: string;
  role: 'teacher' | 'professional' | 'leader' | 'admin' | 'cholis';
  username: string;
  position?: string | null;
  // Signed session token issued by the server at sign-in. The server uses
  // this — not anything else the browser sends — to decide who you are.
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'cholis_session';

function readStoredSession(): AuthUser | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed.token === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function storeSession(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* storage unavailable: session lasts until the page closes */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On start-up, check that a saved session is still accepted by the server
  // (sessions end after a few hours, or when the online app restarts).
  useEffect(() => {
    const stored = readStoredSession();
    if (!stored) {
      storeSession(null);
      setLoading(false);
      return;
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored.token}` } })
      .then(res => {
        if (res.ok) setUser(stored);
        else storeSession(null);
      })
      .catch(() => setUser(stored))
      .finally(() => setLoading(false));
  }, []);

  // If the server says a session has expired while someone is using the app,
  // return them to the sign-in page instead of showing empty screens.
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const res = await originalFetch(...args);
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url ?? '';
      if (res.status === 401 && url.includes('/api/') && !url.includes('/api/auth/login')) {
        storeSession(null);
        setUser(null);
      }
      return res;
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      let message = 'Login failed';
      try { message = (await res.json()).error ?? message; } catch { /* ignore */ }
      throw new Error(message);
    }
    const data: AuthUser = await res.json();
    setUser(data);
    storeSession(data);
  };

  const logout = () => {
    setUser(null);
    storeSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Helper: build auth headers for API calls
export function authHeaders(user: AuthUser) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${user.token}`,
  };
}
