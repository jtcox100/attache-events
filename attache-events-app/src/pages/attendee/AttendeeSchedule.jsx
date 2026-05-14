import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BottomNav from '../../components/BottomNav';
import api from '../../services/api';

const SunIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const MoonIcon = () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>;

function getTrackStyle(track, isMandatory) {
  if (isMandatory) return { bg: '#f5f5f5', badge: '#262D33', text: '#fff' };
  const t = (track || '').toLowerCase();
  if (t.includes('lenovo'))     return { bg: '#fff3f0', badge: '#E2231A', text: '#fff' };
  if (t.includes('business'))   return { bg: '#f0f7f5', badge: '#0D7B72', text: '#fff' };
  if (t.includes('technology')) return { bg: '#f0f5fa', badge: '#185676', text: '#fff' };
  if (t.includes('digital'))    return { bg: '#edf4f9', badge: '#709CBB', text: '#fff' };
  return { bg: '#fff', badge: '#f3f4f6', text: '#666' };
}

export default function AttendeeSchedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [tab, setTab] = useState('all');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    if (!user?.event_id) return;
    loadSessions();
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [user]);

  async function loadSessions() {
    try {
      const { data } = await api.get(`/api/sessions/event/${user.event_id}`);
      setSessions(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleRegister(sessionId) {
    const target = sessions.find(s => (s.session_id || s.id) === sessionId);
    if (target) {
      const targetStart = new Date(target.start_time);
      const targetEnd = new Date(target.end_time);
      const conflict = sessions.find(s => {
        if ((s.session_id || s.id) === sessionId) return false;
        if (s.my_status !== 'registered' && !s.is_mandatory) return false;
        const sStart = new Date(s.start_time);
        const sEnd = new Date(s.end_time);
        return targetStart < sEnd && targetEnd > sStart;
      });
      if (conflict) {
        setActionMsg(`Time conflict with "${conflict.title}"`);
        setTimeout(() => setActionMsg(''), 5000);
        return;
      }
    }
    try {
      const { data } = await api.post(`/api/sessions/${sessionId}/register`);
      setActionMsg(data.message); loadSessions();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Registration failed');
      setTimeout(() => setActionMsg(''), 3000);
    }
  }

  async function handleCancel(sessionId) {
    try {
      await api.delete(`/api/sessions/${sessionId}/register`);
      setActionMsg('Registration cancelled'); loadSessions();
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      setActionMsg(err.response?.data?.error || 'Failed');
      setTimeout(() => setActionMsg(''), 3000);
    }
  }

  const displayed = tab === 'all' ? sessions :
    sessions.filter(s => s.my_status === 'registered' || s.my_status === 'waitlisted' || s.is_mandatory === true);

  // Group by 24h time key for correct chronological sorting
  const grouped = displayed.reduce((acc, s) => {
    const key = new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const bg = dark ? '#0f172a' : '#f8f8f8';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';
  const activeTab = { color: '#9D2235', borderBottom: '2px solid #9D2235' };
  const inactiveTab = { color: sub, borderBottom: '2px solid transparent' };

  const LEGEND = [['General','#262D33'],['Business','#0D7B72'],['Technology','#185676'],['Digital Transformation','#709CBB'],['Lenovo','#E2231A']];

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', paddingBottom: 106 }}>
      {/* Header */}
      <div style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderBottom: `1px solid ${border}`, padding: '1rem 1.25rem 0', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Schedule</h1>
          <button onClick={toggle} style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 20, padding: '4px 10px', cursor: 'pointer', color: dark ? '#f1f5f9' : '#1a1a1a', display: 'flex', alignItems: 'center', gap: 4 }}>
            {dark ? <SunIcon /> : <MoonIcon />}
            <span style={{ fontSize: 12 }}>{dark ? 'Light' : 'Dark'}</span>
          </button>
        </div>
        <div style={{ display: 'flex' }}>
          <button onClick={() => setTab('all')} style={{ flex: 1, background: 'none', border: 'none', padding: '0.5rem 0', cursor: 'pointer', fontSize: 14, fontWeight: 500, ...(tab === 'all' ? activeTab : inactiveTab) }}>All Sessions</button>
          <button onClick={() => setTab('mine')} style={{ flex: 1, background: 'none', border: 'none', padding: '0.5rem 0', cursor: 'pointer', fontSize: 14, fontWeight: 500, ...(tab === 'mine' ? activeTab : inactiveTab) }}>My Schedule</button>
        </div>
      </div>

      {/* Track legend */}
      <div style={{ backgroundColor: dark ? '#1e293b' : '#fff', borderBottom: `1px solid ${border}`, padding: '0.5rem 1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        {LEGEND.map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
            <span style={{ fontSize: 11, color: sub }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Toast */}
      {actionMsg && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 100, maxWidth: 340, width: 'calc(100% - 2rem)', padding: '0.75rem 1rem', borderRadius: 10, fontSize: 13, fontWeight: 500, textAlign: 'center', backgroundColor: actionMsg.includes('conflict') ? '#9D2235' : '#262D33', color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
          {actionMsg}
        </div>
      )}

      {/* Sessions */}
      <div style={{ padding: '0.75rem 1rem' }}>
        {loading && <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>Loading sessions...</p>}
        {!loading && displayed.length === 0 && (
          <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>
            {tab === 'mine' ? 'No sessions registered yet' : 'No sessions available'}
          </p>
        )}

        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([timeKey, timeSessions]) => {
          const displayTime = new Date(`2000-01-01T${timeKey}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={timeKey} style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#9D2235', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', paddingLeft: 4 }}>{displayTime}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {timeSessions.map(s => {
                  const sid = s.session_id || s.id;
                  const isMandatory = s.is_mandatory;
                  const isRegistered = s.my_status === 'registered';
                  const isWaitlisted = s.my_status === 'waitlisted';
                  const isFull = s.seats_remaining <= 0;
                  const isPast = new Date(s.end_time) < new Date();
                  const isLive = new Date(s.start_time) <= new Date() && new Date(s.end_time) >= new Date();
                  const startTime = new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const endTime = new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const duration = Math.round((new Date(s.end_time) - new Date(s.start_time)) / 60000);
                  const tc = getTrackStyle(s.track, isMandatory);
                  const mandatoryBorder = dark ? '#9ca3af' : '#262D33';
                  const leftBorder = isPast ? '#d1d5db' : isMandatory ? mandatoryBorder : isRegistered ? '#16a34a' : isWaitlisted ? '#d97706' : 'transparent';
                  const cardBackground = isPast ? (dark ? '#1a2030' : '#f9fafb') : dark ? '#1e293b' : (isMandatory || (!isRegistered && !isWaitlisted) ? tc.bg : '#fff');

                  return (
                    <div key={sid} style={{ backgroundColor: cardBackground, borderTop: `1px solid ${border}`, borderRight: `1px solid ${border}`, borderBottom: `1px solid ${border}`, borderLeft: `4px solid ${leftBorder}`, borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p onClick={() => navigate(`/attendee/session/${sid}`)} style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(0,0,0,0.2)' }}>{s.title}</p>
                            <p style={{ fontSize: 12, color: sub, margin: '0 0 2px' }}>{startTime} – {endTime} · {duration} min · {s.room_name}</p>
                            {s.speaker_name && <p style={{ fontSize: 12, color: sub, margin: '0 0 4px' }}>{s.speaker_name}</p>}
                            {s.track && (
                              <span style={{ display: 'inline-block', fontSize: 11, padding: '1px 8px', borderRadius: 10, backgroundColor: tc.badge, color: tc.text }}>{s.track}</span>
                            )}
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            {isMandatory ? (
                              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: '#fff', fontSize: 14 }}>✓</span>
                              </div>
                            ) : isPast ? (
                              <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: '#9ca3af', fontSize: 14 }}>+</span>
                              </div>
                            ) : isRegistered ? (
                              <button onClick={() => handleCancel(sid)} style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#16a34a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: '#fff', fontSize: 14 }}>✓</span>
                              </button>
                            ) : isWaitlisted ? (
                              <button onClick={() => handleCancel(sid)} style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#d97706', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: '#fff', fontSize: 12 }}>W</span>
                              </button>
                            ) : (
                              <button onClick={() => handleRegister(sid)} style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: dark ? '#334155' : '#f3f4f6', border: `1px solid ${border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ color: sub, fontSize: 18, lineHeight: 1 }}>+</span>
                              </button>
                            )}
                          </div>
                        </div>
                        <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {isPast ? (
                            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>Session has ended</span>
                          ) : isLive ? (
                            <span style={{ fontSize: 12, color: '#185676', fontWeight: 600 }}>● Live now</span>
                          ) : isMandatory ? (
                            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>Required — all attendees</span>
                          ) : isFull ? (
                            <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>Session full</span>
                          ) : (
                            <span style={{ fontSize: 12, color: sub }}>{s.seats_remaining} of {s.capacity} seats remaining</span>
                          )}
                          {isWaitlisted && !isPast && <span style={{ fontSize: 11, color: '#d97706' }}>Waitlisted</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
