import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BottomNav from '../../components/BottomNav';
import api from '../../services/api';

export default function AttendeeVendors() {
  const { user } = useAuth();
  const { dark } = useTheme();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/vendor/list').then(r => setVendors(r.data || [])).catch(() => setVendors([])).finally(() => setLoading(false));
  }, []);

  const bg = dark ? '#0f172a' : '#f8f8f8';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', paddingBottom: 106 }}>
      <div style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderBottom: `1px solid ${border}`, padding: '1rem 1.25rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Solution Partners</h1>
      </div>
      <div style={{ padding: '1rem' }}>
        {loading && <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>Loading...</p>}
        {!loading && vendors.length === 0 && <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>No solution partners listed yet</p>}
        {vendors.map(v => (
          <div key={v.id} style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1rem', marginBottom: '0.5rem' }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 2px' }}>{v.company_name}</p>
            <p style={{ fontSize: 13, color: sub, margin: 0 }}>{v.email}</p>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
