import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export default function AttendeePartnerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { dark } = useTheme();
  const navigate = useNavigate();
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.event_id) {
      api.get(`/api/partners/event/${user.event_id}`)
        .then(r => {
          const found = (r.data || []).find(p => p.id === id);
          setPartner(found || null);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id, user]);

  const bg = dark ? '#0f172a' : '#f8f8f8';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';

  if (loading) return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: sub }}>Loading...</p>
    </div>
  );

  if (!partner) return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: sub }}>Partner not found</p>
    </div>
  );

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', paddingBottom: 32 }}>
      {/* Header */}
      <div style={{ backgroundColor: '#9D2235', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontSize: 22, padding: 0, lineHeight: 1 }}>‹</button>
        <h1 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: '#fff' }}>Solution Partner</h1>
      </div>

      <div style={{ padding: '1rem' }}>
        {/* Logo + name card */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
          {partner.logo_url ? (
            <img src={partner.logo_url} alt={partner.name}
              style={{ maxHeight: 80, maxWidth: 240, objectFit: 'contain', margin: '0 auto 1rem', display: 'block' }} />
          ) : (
            <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: '#9D2235' }}>{partner.name[0]}</span>
            </div>
          )}
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 0.75rem', color: dark ? '#f1f5f9' : '#262D33' }}>{partner.name}</h2>

          {/* Contact info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {partner.address && <p style={{ fontSize: 13, color: sub, margin: 0 }}>📍 {partner.address}</p>}
            {partner.phone && <p style={{ fontSize: 13, color: sub, margin: 0 }}>📞 {partner.phone}</p>}
            {partner.email && (
              <a href={`mailto:${partner.email}`} style={{ fontSize: 13, color: '#9D2235', margin: 0, fontWeight: 500 }}>
                ✉️ {partner.email}
              </a>
            )}
          </div>
        </div>

        {/* Description */}
        {partner.description && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9D2235', margin: '0 0 0.75rem' }}>About</p>
            <p style={{ fontSize: 14, color: dark ? '#cbd5e1' : '#374151', margin: 0, lineHeight: 1.7 }}>{partner.description}</p>
          </div>
        )}

        {/* Speakers */}
        {partner.speakers?.length > 0 && (
          <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem' }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9D2235', margin: '0 0 0.75rem' }}>
              Speakers ({partner.speakers.length})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {partner.speakers.map(sp => (
                <button key={sp.id} onClick={() => navigate(`/attendee/speaker/${sp.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: dark ? '#0f172a' : '#f9fafb', border: `1px solid ${border}`, borderRadius: 10, padding: '0.75rem', cursor: 'pointer', textAlign: 'left' }}>
                  {sp.photo_url ? (
                    <img src={sp.photo_url} alt={sp.name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #9D2235' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#9D2235', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{sp.name[0]}</span>
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px', color: dark ? '#f1f5f9' : '#262D33' }}>{sp.name}</p>
                    {(sp.title || sp.company) && (
                      <p style={{ fontSize: 12, color: sub, margin: 0 }}>{[sp.title, sp.company].filter(Boolean).join(' · ')}</p>
                    )}
                  </div>
                  <span style={{ color: '#9D2235', fontSize: 16, flexShrink: 0 }}>›</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
