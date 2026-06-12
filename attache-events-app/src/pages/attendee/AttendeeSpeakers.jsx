import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BottomNav from '../../components/BottomNav';
import api from '../../services/api';

export default function AttendeeSpeakers() {
  const { user } = useAuth();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [speakers, setSpeakers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionSpeakerMap, setSessionSpeakerMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.event_id) return;
    async function load() {
      try {
        const [spRes, sessRes, mapRes] = await Promise.all([
          api.get(`/api/speakers/event/${user.event_id}`),
          api.get(`/api/sessions/event/${user.event_id}`),
          api.get(`/api/speakers/event/${user.event_id}/sessions`)
        ]);
        setSpeakers(spRes.data || []);
        setSessions(sessRes.data || []);
        // Convert map values to Sets
        const raw = mapRes.data || {};
        const map = {};
        for (const [sid, sessionIds] of Object.entries(raw)) {
          map[sid] = new Set(sessionIds);
        }
        setSessionSpeakerMap(map);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [user]);

  // Find sessions for a speaker
  function getSessionsForSpeaker(speakerId) {
    const junctionIds = sessionSpeakerMap[speakerId] || new Set();
    return sessions.filter(s => {
      const sid = s.session_id || s.id;
      return s.speaker_id === speakerId || junctionIds.has(sid);
    });
  }

  const filtered = speakers.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.company || '').toLowerCase().includes(search.toLowerCase())
  );

  const bg = dark ? '#0f172a' : '#f8f8f8';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';

  return (
    <div style={{ backgroundColor: bg, paddingBottom: 90 }}>
      <div style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderBottom: `1px solid ${border}`, padding: '1rem 1.25rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 0.75rem' }}>Speakers</h1>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search speakers..."
          style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: `1px solid ${border}`, backgroundColor: dark ? '#0f172a' : '#f3f4f6', color: dark ? '#f1f5f9' : '#1a1a1a', fontSize: 14, boxSizing: 'border-box' }} />
      </div>

      <div style={{ padding: '0.75rem 1rem' }}>
        {loading && <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>Loading speakers...</p>}
        {!loading && filtered.length === 0 && <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>No speakers found</p>}

        {filtered.map(sp => {
          const spSessions = getSessionsForSpeaker(sp.id);
          return (
            <div key={sp.id} onClick={() => navigate(`/attendee/speaker/${sp.id}`)} style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: 0 }}>
                {sp.photo_url ? (
                  <img src={sp.photo_url} alt={sp.name}
                    style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #9D2235' }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#9D2235', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{sp.name[0]}</span>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 2px', color: dark ? '#f1f5f9' : '#262D33' }}>{sp.name}</p>
                  {(sp.title || sp.company) && (
                    <p style={{ fontSize: 13, color: sub, margin: '0 0 6px' }}>
                      {[sp.title, sp.company].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {spSessions.length > 0 && (
                    <p style={{ fontSize: 12, color: '#9D2235', fontWeight: 600, margin: '4px 0 0' }}>
                      {spSessions.length} session{spSessions.length !== 1 ? 's' : ''} →
                    </p>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
