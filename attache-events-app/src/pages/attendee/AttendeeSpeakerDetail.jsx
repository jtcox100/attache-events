import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function AttendeeSpeakerDetail() {
  const { id } = useParams();
  const { dark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [speaker, setSpeaker] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.event_id) return;
    Promise.all([
      api.get(`/api/speakers/event/${user.event_id}`),
      api.get(`/api/sessions/event/${user.event_id}`)
    ]).then(([spRes, sessRes]) => {
      const found = (spRes.data || []).find(s => s.id === id);
      setSpeaker(found || null);
      const spSessions = (sessRes.data || []).filter(s => s.speaker_id === id);
      setSessions(spSessions);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, [id, user]);

  const bg = dark ? '#0f172a' : '#f8f8f8';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';

  const trackColors = {
    lenovo: '#E2231A',
    business: '#0D7B72',
    technology: '#185676',
    digital: '#709CBB',
  };
  function trackColor(track) {
    const t = (track || '').toLowerCase();
    return Object.entries(trackColors).find(([k]) => t.includes(k))?.[1] || '#262D33';
  }

  if (loading) return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: sub }}>Loading...</p>
    </div>
  );

  if (!speaker) return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: sub }}>Speaker not found</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ backgroundColor: '#9D2235', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 22, padding: 0, lineHeight: 1 }}>‹</button>
        <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#fff' }}>Speaker Profile</h1>
      </div>

      {/* Hero photo */}
      <div style={{ backgroundColor: '#9D2235', padding: '1.5rem 1rem 2rem', textAlign: 'center' }}>
        {speaker.photo_url ? (
          <img src={speaker.photo_url} alt={speaker.name}
            style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '4px solid rgba(255,255,255,0.4)', margin: '0 auto', display: 'block' }} />
        ) : (
          <div style={{ width: 120, height: 120, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '4px solid rgba(255,255,255,0.4)' }}>
            <span style={{ color: '#fff', fontSize: 44, fontWeight: 700 }}>{speaker.name[0]}</span>
          </div>
        )}
        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '1rem 0 4px' }}>{speaker.name}</h2>
        {speaker.title && <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, margin: '0 0 2px' }}>{speaker.title}</p>}
        {speaker.company && <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, margin: 0, fontWeight: 500 }}>{speaker.company}</p>}
      </div>

      <div style={{ padding: '1rem' }}>
        {/* Bio */}
        {speaker.bio && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9D2235', margin: '0 0 0.75rem' }}>About</p>
            <p style={{ fontSize: 14, color: dark ? '#cbd5e1' : '#374151', margin: 0, lineHeight: 1.7 }}>{speaker.bio}</p>
          </div>
        )}

        {/* Sessions */}
        {sessions.length > 0 && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem' }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9D2235', margin: '0 0 0.75rem' }}>
              Sessions ({sessions.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sessions.map(s => {
                const sid = s.session_id || s.id;
                const startTime = new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const tc = trackColor(s.track);
                const isPast = new Date(s.end_time) < new Date();
                return (
                  <button key={sid} onClick={() => navigate(`/attendee/session/${sid}`)}
                    style={{ textAlign: 'left', backgroundColor: dark ? '#0f172a' : '#f9fafb', border: `1px solid ${border}`, borderLeft: `4px solid ${tc}`, borderRadius: 8, padding: '0.75rem', cursor: 'pointer' }}>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px', color: dark ? '#f1f5f9' : '#262D33' }}>{s.title}</p>
                    <p style={{ fontSize: 12, color: sub, margin: '0 0 2px' }}>🕐 {startTime} – {endTime}</p>
                    <p style={{ fontSize: 12, color: sub, margin: 0 }}>📍 {s.room_name}</p>
                    {s.track && (
                      <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, padding: '1px 8px', borderRadius: 10, backgroundColor: tc, color: '#fff' }}>{s.track}</span>
                    )}
                    {isPast && <span style={{ display: 'inline-block', marginTop: 4, marginLeft: 4, fontSize: 11, padding: '1px 8px', borderRadius: 10, backgroundColor: '#f3f4f6', color: '#9ca3af' }}>Ended</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem' }}>
            <p style={{ fontSize: 14, color: sub, margin: 0, textAlign: 'center' }}>No sessions assigned yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
