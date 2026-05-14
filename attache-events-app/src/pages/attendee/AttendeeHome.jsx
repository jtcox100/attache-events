import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BottomNav from '../../components/BottomNav';
import api from '../../services/api';

const tiles = [
  { label: 'Sessions', path: '/attendee/schedule', emoji: '📅' },
  { label: 'Speakers', path: '/attendee/speakers', emoji: '🎤' },
  { label: 'Solution Partners', path: '/attendee/partners', emoji: '🤝' },
  { label: 'Attendees', path: '/attendee/attendees', emoji: '👥' },
  { label: 'WiFi Info', path: '/attendee/wifi', emoji: '📶' },
  { label: 'Floor Plan', path: '/attendee/floorplan', emoji: '🗺️' },
];

export default function AttendeeHome() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    if (user?.event_id) {
      api.get(`/api/events/${user.event_id}`).then(r => setEvent(r.data)).catch(console.error);
    }
  }, [user]);

  const cardBg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';

  return (
    <div style={{ paddingBottom: 106 }}>
      {/* Header */}
      <div style={{ backgroundColor: '#9D2235', padding: '0', position: 'relative' }}>
        <div style={{ padding: '0.6rem 0.75rem 1rem', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
            <button onClick={toggle} style={{
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 20, padding: '3px 10px', cursor: 'pointer', color: '#fff',
              display: 'flex', alignItems: 'center', gap: 4, fontSize: 11
            }}>
              {dark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
          <div style={{ lineHeight: 0, fontSize: 0 }}>
            <img src="/showcase-logo-white.png" alt="London Technology Showcase"
              style={{ width: '100%', maxWidth: 320, height: 'auto', display: 'block', margin: '0 auto', border: 'none', outline: 'none' }} />
          </div>
        </div>

        {/* Event name and date */}
        <div style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '0.75rem 1.5rem' }}>
          <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0, textAlign: 'center' }}>
            {event?.name || ''}
          </p>
          {event?.event_date && (
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: '2px 0 0', textAlign: 'center' }}>
              {new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>

      {/* Welcome strip */}
      <div style={{ backgroundColor: dark ? '#1e293b' : '#f3f4f6', padding: '0.6rem 1.5rem', borderBottom: `1px solid ${border}` }}>
        <p style={{ margin: 0, fontSize: 13, color: sub }}>
          Welcome, <strong style={{ color: dark ? '#f1f5f9' : '#1a1a1a' }}>{user?.name}</strong>
        </p>
      </div>

      {/* Tile grid */}
      <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        {tiles.map(tile => (
          <button key={tile.path} onClick={() => navigate(tile.path)}
            style={{
              backgroundColor: cardBg, border: `1px solid ${border}`,
              borderRadius: 12, padding: '1.5rem 1rem',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
              cursor: 'pointer',
              boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.06)'
            }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.97)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: 30 }}>{tile.emoji}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: dark ? '#f1f5f9' : '#1a1a1a', textAlign: 'center' }}>{tile.label}</span>
          </button>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
