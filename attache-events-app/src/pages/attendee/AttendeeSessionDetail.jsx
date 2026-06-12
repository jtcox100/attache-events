import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { sessionStatus } from '../../utils/sessionStatus';

export default function AttendeeSessionDetail() {
  const { id } = useParams();
  const { dark } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [sessionSpeakers, setSessionSpeakers] = useState([]);
  const [myStatus, setMyStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    try {
      const [sessRes, allRes, speakersRes] = await Promise.all([
        api.get(`/api/sessions/${id}`),
        api.get(`/api/sessions/event/${user.event_id}`),
        api.get(`/api/sessions/${id}/speakers`)
      ]);
      setSession(sessRes.data);
      const found = (allRes.data || []).find(s => (s.session_id || s.id) === id);
      setMyStatus(found?.my_status || null);
      setSession(prev => ({ ...prev, ...found }));
      const speakers = (speakersRes.data || []).filter(s => s && s.id);
      if (speakers.length > 0) {
        setSessionSpeakers(speakers);
      } else if (sessRes.data?.speaker_id) {
        setSessionSpeakers([{
          id: sessRes.data.speaker_id,
          name: found?.speaker_name || sessRes.data.speaker_name,
          title: found?.speaker_title || sessRes.data.speaker_title,
          company: found?.speaker_company || sessRes.data.speaker_company,
          photo_url: found?.speaker_photo_url || sessRes.data.speaker_photo_url
        }]);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleRegister() {
    try {
      const { data } = await api.post(`/api/sessions/${id}/register`);
      setMyStatus(data.status);
      setActionMsg(data.message);
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Registration failed');
      setTimeout(() => setActionMsg(''), 4000);
    }
  }

  async function handleCancel() {
    try {
      await api.delete(`/api/sessions/${id}/register`);
      setMyStatus(null);
      setActionMsg('Registration cancelled');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed');
      setTimeout(() => setActionMsg(''), 3000);
    }
  }

  const bg = dark ? '#0f172a' : '#f8f8f8';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';

  if (loading) return (
    <div style={{ backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: sub }}>Loading...</p>
    </div>
  );

  if (!session) return (
    <div style={{ backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: sub }}>Session not found</p>
    </div>
  );

  const isPast = new Date(session.end_time) < new Date();
  const isLive = new Date(session.start_time) <= new Date() && new Date(session.end_time) >= new Date();
  const isMandatory = session.is_mandatory;
  const isRegistered = myStatus === 'registered';
  const isWaitlisted = myStatus === 'waitlisted';
  const isFull = session.seats_remaining <= 0;
  const capacityStatus = sessionStatus(session);

  const startTime = new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = new Date(session.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const duration = Math.round((new Date(session.end_time) - new Date(session.start_time)) / 60000);
  const dateStr = new Date(session.start_time).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' });

  const trackColors = {
    business: '#0D7B72',
    technology: '#185676',
    digital: '#709CBB',
    lenovo: '#E2231A',
    traditional: '#4A5568',
    demonstration: '#2563EB',
    artificial: '#059669',
    cyber: '#7C3AED',
  };
  const trackKey = (session.track || '').toLowerCase();
  const tc = Object.entries(trackColors).find(([k]) => trackKey.includes(k))?.[1] || '#262D33';

  return (
    <div style={{ backgroundColor: bg, paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ backgroundColor: '#9D2235', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 22, padding: 0, lineHeight: 1 }}>‹</button>
        <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#fff' }}>Session Details</h1>
      </div>

      <div style={{ padding: '1rem' }}>
        {/* Main card */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderLeft: `4px solid ${tc}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
          {session.track && (
            <span style={{ display: 'inline-block', fontSize: 11, padding: '2px 10px', borderRadius: 10, backgroundColor: tc, color: '#fff', marginBottom: '0.5rem' }}>
              {session.track}
            </span>
          )}
          {isLive && <span style={{ display: 'inline-block', fontSize: 11, padding: '2px 10px', borderRadius: 10, backgroundColor: '#185676', color: '#fff', marginBottom: '0.5rem', marginLeft: 6 }}>● Live now</span>}

          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 0.75rem', lineHeight: 1.3, color: dark ? '#f1f5f9' : '#262D33' }}>{session.title}</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '1rem' }}>
            <p style={{ fontSize: 14, color: sub, margin: 0 }}>📅 {dateStr}</p>
            <p style={{ fontSize: 14, color: sub, margin: 0 }}>🕐 {startTime} – {endTime} · {duration} min</p>
            <p style={{ fontSize: 14, color: sub, margin: 0 }}>📍 {session.room_name || session.rooms?.name}</p>
          </div>

          {/* Registration */}
          {isPast ? (
            <div style={{ backgroundColor: '#f3f4f6', borderRadius: 8, padding: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#9ca3af', fontWeight: 600, margin: 0 }}>Session has ended</p>
            </div>
          ) : isMandatory ? (
            <div style={{ backgroundColor: dark ? '#1e293b' : '#f5f5f5', border: `1px solid ${border}`, borderRadius: 8, padding: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#9ca3af', fontWeight: 600, margin: 0 }}>✓ Required — all attendees</p>
            </div>
          ) : isRegistered ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, backgroundColor: '#f0f7f0', border: '1px solid #16a34a', borderRadius: 8, padding: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, margin: 0 }}>✓ You're registered</p>
              </div>
              <button onClick={handleCancel} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #9D2235', backgroundColor: 'transparent', color: '#9D2235', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          ) : isWaitlisted ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, backgroundColor: '#fef9ee', border: '1px solid #d97706', borderRadius: 8, padding: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#d97706', fontWeight: 600, margin: 0 }}>You're on the waitlist</p>
              </div>
              <button onClick={handleCancel} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #9D2235', backgroundColor: 'transparent', color: '#9D2235', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={handleRegister}
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: 'none', backgroundColor: isFull ? '#6b7280' : '#9D2235', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {isFull ? 'Join Waitlist' : '+ Register for this session'}
            </button>
          )}

          {actionMsg && (
            <p style={{ fontSize: 13, fontWeight: 500, marginTop: 8, textAlign: 'center', color: actionMsg.includes('cancel') ? '#9D2235' : '#2d6a2d' }}>{actionMsg}</p>
          )}

          {!isPast && !isMandatory && (
            <p style={{ fontSize: 12, color: capacityStatus.color, fontWeight: capacityStatus.key === 'available' ? 500 : 600, margin: '0.5rem 0 0', textAlign: 'center' }}>
              {capacityStatus.label}
            </p>
          )}
        </div>

        {/* Description */}
        {(session.description_brief || session.description_full) && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9D2235', margin: '0 0 0.5rem' }}>About this session</p>
            <p style={{ fontSize: 14, color: dark ? '#cbd5e1' : '#374151', margin: 0, lineHeight: 1.6 }}>
              {expanded ? (session.description_full || session.description_brief) : (session.description_brief || session.description_full)}
            </p>
            {session.description_full && session.description_brief && session.description_full !== session.description_brief && (
              <button onClick={() => setExpanded(!expanded)} style={{ background: 'none', border: 'none', color: '#9D2235', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0.5rem 0 0', display: 'block' }}>
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

        {/* Speakers */}
        {sessionSpeakers.length > 0 && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9D2235', margin: '0 0 1rem' }}>
              {sessionSpeakers.length === 1 ? 'Speaker' : `Speakers (${sessionSpeakers.length})`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sessionSpeakers.map(sp => (
                <div key={sp.id} onClick={() => sp.id && navigate(`/attendee/speaker/${sp.id}`)}
                  style={{ display: 'flex', gap: '1rem', alignItems: 'center', cursor: sp.id ? 'pointer' : 'default', padding: '0.5rem', borderRadius: 8, backgroundColor: dark ? '#0f172a' : '#f9fafb', border: `1px solid ${border}` }}>
                  {sp.photo_url ? (
                    <img src={sp.photo_url} alt={sp.name}
                      style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #9D2235' }} />
                  ) : (
                    <div style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: '#9D2235', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{sp.name?.[0]}</span>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, margin: '0 0 2px', color: dark ? '#f1f5f9' : '#262D33' }}>{sp.name}</p>
                    {(sp.title || sp.company) && (
                      <p style={{ fontSize: 13, color: sub, margin: 0 }}>
                        {[sp.title, sp.company].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  {sp.id && <span style={{ color: '#9D2235', fontSize: 18, flexShrink: 0 }}>›</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Survey link */}
        {!isMandatory && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
            {!isLive && !isPast ? (
              <>
                <p style={{ fontSize: 13, color: sub, margin: '0 0 0.5rem' }}>📝 Session Survey</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>Available once the session begins</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: sub, margin: '0 0 0.75rem' }}>
                  {isPast ? 'Share your feedback on this session' : 'Enjoying the session? Share your feedback!'}
                </p>
                <a href={`/survey?event=${user?.event_id}&session=${id}`}
                  style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 8, backgroundColor: isPast ? '#262D33' : '#9D2235', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                  📝 Take the Survey
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
