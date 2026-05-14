import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BottomNav from '../../components/BottomNav';
import api from '../../services/api';

export default function AttendeePartners() {
  const { user } = useAuth();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (user?.event_id) {
      api.get(`/api/partners/event/${user.event_id}`)
        .then(r => setPartners(r.data || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const filtered = partners.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const bg = dark ? '#0f172a' : '#f8f8f8';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', paddingBottom: 106 }}>
      <div style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderBottom: `1px solid ${border}`, padding: '1rem 1.25rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 0.75rem' }}>Solution Partners</h1>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search partners..."
          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: `1px solid ${border}`, backgroundColor: dark ? '#0f172a' : '#f3f4f6', color: dark ? '#f1f5f9' : '#1a1a1a', fontSize: 14, boxSizing: 'border-box' }} />
      </div>

      <div style={{ padding: '0.75rem 1rem' }}>
        {loading && <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>Loading...</p>}
        {!loading && filtered.length === 0 && <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>No solution partners found</p>}

        {filtered.map(p => (
          <div key={p.id} onClick={() => navigate(`/attendee/partner/${p.id}`)}
            style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}>
            {p.logo_url ? (
              <img src={p.logo_url} alt={p.name}
                style={{ width: 64, height: 48, objectFit: 'contain', flexShrink: 0, border: `1px solid ${border}`, borderRadius: 6, padding: 4, backgroundColor: '#fff' }} />
            ) : (
              <div style={{ width: 64, height: 48, flexShrink: 0, border: `1px solid ${border}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: dark ? '#0f172a' : '#f9fafb' }}>
                <span style={{ fontSize: 10, color: sub }}>No logo</span>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 15, fontWeight: 600, margin: '0 0 2px', color: dark ? '#f1f5f9' : '#262D33', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
              {p.speakers?.length > 0 && (
                <p style={{ fontSize: 12, color: sub, margin: 0 }}>{p.speakers.length} speaker{p.speakers.length !== 1 ? 's' : ''}</p>
              )}
            </div>
            <span style={{ color: sub, fontSize: 18, flexShrink: 0 }}>›</span>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
