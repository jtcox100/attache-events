import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export default function AttendeeDetail() {
  const { id } = useParams();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [attendee, setAttendee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/attendees/public/profile/${id}`)
      .then(r => setAttendee(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const bg = dark ? '#0f172a' : '#f8f8f8';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh' }}>
      <div style={{ backgroundColor: dark ? '#1e293b' : '#fff', borderBottom: `1px solid ${border}`, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9D2235', fontSize: 14, fontWeight: 600, padding: 0 }}>← Back</button>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Attendee Profile</h1>
      </div>

      <div style={{ padding: '1.5rem 1rem' }}>
        {loading && <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>Loading...</p>}
        {!loading && !attendee && <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>Profile not found</p>}
        {!loading && attendee && (
          <>
            {/* Photo + name */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
              {attendee.photo_url ? (
                <img src={attendee.photo_url} alt={attendee.name}
                  style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid #9D2235', marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
              ) : (
                <div style={{ width: 90, height: 90, borderRadius: '50%', backgroundColor: '#9D2235', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#fff', fontSize: 32, fontWeight: 700 }}>{attendee.name[0]}</span>
                </div>
              )}
              <p style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{attendee.name}</p>
              {attendee.pronouns && <p style={{ fontSize: 12, color: sub, margin: '0 0 4px' }}>{attendee.pronouns}</p>}
              {attendee.title && <p style={{ fontSize: 14, color: sub, margin: '0 0 2px' }}>{attendee.title}</p>}
              {attendee.company && <p style={{ fontSize: 14, color: sub, margin: '0 0 2px' }}>{attendee.company}</p>}
              {attendee.city && <p style={{ fontSize: 13, color: sub, margin: '0.25rem 0 0' }}>📍 {attendee.city}</p>}
            </div>

            {/* Headline */}
            {attendee.headline && (
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: 15, color: dark ? '#cbd5e1' : '#374151', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>"{attendee.headline}"</p>
              </div>
            )}

            {/* About me */}
            {attendee.about_me && (
              <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9D2235', margin: '0 0 0.5rem' }}>About</p>
                <p style={{ fontSize: 14, color: dark ? '#cbd5e1' : '#374151', margin: 0, lineHeight: 1.6 }}>{attendee.about_me}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
