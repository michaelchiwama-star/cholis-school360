import React from 'react';
import { useAuth } from '../AuthContext';
import CholisInbox from '../CholisInbox';

export default function CholisPage() {
  const { user } = useAuth();
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">CHOLIS Professional Portal</h1>
        <p className="page-subtitle">{user?.name} · {user?.position ?? 'CHOLIS Professional'} · Center for Holistic Schools Global</p>
      </div>
      <CholisInbox />
    </div>
  );
}
