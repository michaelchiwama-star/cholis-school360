import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';

interface DemoAccount {
  label: string;
  username: string;
  password?: string;
  role: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/demo-accounts')
      .then(r => r.json())
      .then(setDemoAccounts)
      .catch(() => {});
  }, []);

  const passwordShown = demoAccounts.some(a => a.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message ?? 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (acc: DemoAccount) => {
    setUsername(acc.username);
    if (acc.password) setPassword(acc.password);
    else passwordRef.current?.focus();
    setError('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo-wrap">
          <img src="/cholis-logo.png" alt="Center for Holistic Schools Global logo" style={{ width: 120, height: "auto" }} />
        </div>
        <h1 className="login-title">CHOLIS School360 Lite</h1>
        <p className="login-sub">Empowering Learners! Strengthening Schools!</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              className={`form-control ${error ? 'error' : ''}`}
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Enter your username"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              ref={passwordRef}
              type="password"
              className={`form-control ${error ? 'error' : ''}`}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {demoAccounts.length > 0 && (
          <div className="demo-accounts">
            <div className="demo-accounts-title">Demonstration Accounts</div>
            {demoAccounts.map(acc => (
              <button key={acc.username} className="demo-account-btn" onClick={() => fillDemo(acc)}>
                {acc.label}
                <span className="demo-account-role"> · {acc.role}</span>
              </button>
            ))}
            {!passwordShown && (
              <p style={{ fontSize: '0.75rem', color: '#5a6a72', marginTop: '0.5rem' }}>
                Choose an account, then enter the demonstration password provided by the CHOLIS team.
              </p>
            )}
          </div>
        )}

        <p style={{ fontSize: '0.75rem', color: '#5a6a72', textAlign: 'center', marginTop: '1rem' }}>
          Demonstration environment · Do not enter real personal information
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          <a href="/parent" style={{ fontSize: '0.8rem', color: '#57872F', fontWeight: 600 }}>Parents: visit the Resource Hub →</a>
        </p>
      </div>
    </div>
  );
}
