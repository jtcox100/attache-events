import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BottomNav from '../../components/BottomNav';
import api from '../../services/api';

export default function AttendeeAttendees() {
  const { user } = useAuth();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [attendees, setAttendees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showVisibilityPrompt, setShowVisibilityPrompt] = useState(false);

  useEffect(() => {
    if (user?.event_id) {
      api.get(`/api/attendees/public/${user.event_id}`)
        .then(r => setAttendees(r.data || []))
        .catch(() => setAttendees([]))
        .finally(() => {
          setLoading(false);
          // Show prompt if user is not visible in directory
          if (!user?.visible_in_directory) setShowVisibilityPrompt(true);
        });
    }
  }, [user]);

  const filtered = attendees.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.company || '').toLowerCase().includes(search.toLowerCase())
  );

  const bg = dark ? '#0f172a' : '#f8f8f8';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';
  const inputBg = dark ? '#0f172a' : '#f3f4f6';

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', paddingBottom: 106 }}>
      <div style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderBottom: `1px solid ${border}`, padding: '1rem 1.25rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 0.75rem' }}>Attendees</h1>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or company..."
          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: `1px solid ${border}`, backgroundColor: inputBg, color: dark ? '#f1f5f9' : '#1a1a1a', fontSize: 14, boxSizing: 'border-box' }} />
      </div>

      {/* Visibility prompt */}
      {showVisibilityPrompt && (
        <div style={{ margin: '0.75rem 1rem', padding: '0.75rem 1rem', backgroundColor: dark ? '#1e3a5f' : '#eff6ff', border: `1px solid ${dark ? '#3b82f6' : '#bfdbfe'}`, borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <p style={{ fontSize: 13, color: dark ? '#93c5fd' : '#1d4ed8', margin: 0 }}>
            You're not visible in the directory. Other attendees can't find you.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button onClick={() => navigate('/attendee/profile')}
              style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: 'none', backgroundColor: '#9D2235', color: '#fff', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Update
            </button>
            <button onClick={() => setShowVisibilityPrompt(false)}
              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: `1px solid ${dark ? '#3b82f6' : '#bfdbfe'}`, backgroundColor: 'transparent', color: dark ? '#93c5fd' : '#1d4ed8', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: '0.75rem 1rem' }}>
        {loading && <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>Loading...</p>}
        {!loading && filtered.length === 0 && (
          <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>
            {attendees.length === 0 ? 'No attendees have made themselves visible yet' : 'No attendees found'}
          </p>
        )}
        {filtered.map(a => (
          <button key={a.id} onClick={() => navigate(`/attendee/profile/${a.id}`)}
            style={{ width: '100%', backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
            {a.photo_url ? (
              <img src={a.photo_url} alt={a.name}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #9D2235' }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#9D2235', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{a.name[0]}</span>
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: dark ? '#f1f5f9' : '#1a1a1a' }}>{a.name}</p>
              {a.title && <p style={{ fontSize: 12, color: sub, margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>}
              {a.company && <p style={{ fontSize: 12, color: sub, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.company}</p>}
            </div>
            <span style={{ color: sub, fontSize: 16, flexShrink: 0 }}>›</span>
          </button>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
