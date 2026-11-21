import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import TeacherPage from './pages/TeacherPage';
import ProfessionalPage from './pages/ProfessionalPage';
import LeaderPage from './pages/LeaderPage';
import AdminPage from './pages/AdminPage';
import CholisPage from './pages/CholisPage';
import NotificationBell from './NotificationBell';
import ParentPage from './pages/ParentPage';

// Shown on every page so no visitor mistakes the demo for a live service.
function DemoBanner() {
  return (
    <div className="demo-banner" role="note">
      <strong>Demonstration version</strong> · All schools, learners and staff are fictional ·
      Do not enter real learner, parent or school information
    </div>
  );
}

function AppShell() {
  const { user, logout, loading } = useAuth();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#002D43' }}>
      <div style={{ textAlign: 'center', color: '#A5B69D' }}>
        <div className="spinner" style={{ borderTopColor: '#57872F', margin: '0 auto 1rem' }}/>
        <div style={{ fontSize: '0.9rem' }}>Loading CHOLIS School360…</div>
      </div>
    </div>
  );

  // Unauthenticated routes (parent hub is always public)
  if (!user) {
    return (
      <BrowserRouter>
        <DemoBanner />
        <Routes>
          <Route path="/parent" element={
            <div className="app-layout">
              <TopNav user={null} logout={logout} />
              <main className="main-content"><ParentPage /></main>
            </div>
          }/>
          <Route path="*" element={<LoginPage />}/>
        </Routes>
      </BrowserRouter>
    );
  }

  const roleRoute = () => {
    switch (user.role) {
      case 'teacher':      return <TeacherPage />;
      case 'professional': return <ProfessionalPage />;
      case 'leader':       return <LeaderPage />;
      case 'admin':        return <AdminPage />;
      case 'cholis':       return <CholisPage />;
      default:             return <div className="alert alert-danger">Unknown role.</div>;
    }
  };

  return (
    <BrowserRouter>
      <DemoBanner />
      <div className="app-layout">
        <TopNav user={user} logout={logout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={roleRoute()} />
            <Route path="/parent" element={<ParentPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

interface TopNavProps {
  user: { name: string; role: string; school_name: string; position?: string | null } | null;
  logout: () => void;
}

function TopNav({ user, logout }: TopNavProps) {
  const roleLabels: Record<string, string> = {
    teacher: 'Teacher',
    professional: 'Counselling & Learner Support',
    leader: 'School Leader',
    admin: 'Administrator',
    cholis: 'CHOLIS Professional',
  };

  return (
    <nav className="topnav">
      <a href="/" className="brand">
        <img src="/cholis-logo.png" alt="Center for Holistic Schools Global logo" className="brand-logo-img" />
        <div className="brand-text">
          <span className="brand-name">School360 Lite</span>
          <span className="brand-tagline">Empowering Learners! Strengthening Schools!</span>
        </div>
      </a>
      <div className="topnav-actions">
        {user ? (
          <>
            <span className="topnav-user">{user.name}</span>
            <span className="topnav-role-badge">{((user.role === 'professional' || user.role === 'leader') && user.position) ? user.position : (roleLabels[user.role] ?? user.role)}</span>
            {['professional', 'cholis', 'admin'].includes(user.role) && <NotificationBell />}
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: '#A5B69D', borderColor: '#A5B69D', fontSize: '0.78rem' }}
              onClick={logout}
            >
              Sign Out
            </button>
          </>
        ) : (
          <a href="/" className="btn btn-ghost btn-sm" style={{ color: '#A5B69D', borderColor: '#A5B69D', fontSize: '0.78rem' }}>
            Staff Sign In
          </a>
        )}
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
