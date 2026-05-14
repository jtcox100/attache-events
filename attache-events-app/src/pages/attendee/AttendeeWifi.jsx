import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BottomNav from '../../components/BottomNav';
import api from '../../services/api';

export default function AttendeeWifi() {
  const { user } = useAuth();
  const { dark } = useTheme();
  const [event, setEvent] = useState(null);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    if (user?.event_id) api.get(`/api/events/${user.event_id}`).then(r => setEvent(r.data)).catch(console.error);
  }, [user]);

  function copy(text, label) {
    navigator.clipboard.writeText(text).then(() => { setCopied(label); setTimeout(() => setCopied(''), 2000); });
  }

  const bg = dark ? '#0f172a' : '#f8f8f8';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';

  const wifiQR = event?.wifi_network
    ? `WIFI:T:WPA;S:${event.wifi_network};P:${event.wifi_password || ''};H:false;;`
    : null;

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', paddingBottom: 106 }}>
      <div style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderBottom: `1px solid ${border}`, padding: '1rem 1.25rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>WiFi Information</h1>
      </div>
      <div style={{ padding: '1rem' }}>
        {!event?.wifi_network ? (
          <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>WiFi information not available yet</p>
        ) : (
          <>
            {/* QR code to connect */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.5rem', marginBottom: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: sub, marginBottom: '1rem' }}>Scan to connect automatically</p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(wifiQR)}`}
                alt="WiFi QR" style={{ width: 180, height: 180, borderRadius: 8, display: 'block', margin: '0 auto' }} />
            </div>

            {/* Network details */}
            <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, overflow: 'hidden', marginBottom: '1rem' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 11, color: sub, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Network</p>
                  <p style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{event.wifi_network}</p>
                </div>
                <button onClick={() => copy(event.wifi_network, 'network')}
                  style={{ fontSize: 12, color: '#9D2235', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  {copied === 'network' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {event.wifi_password && (
                <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: 11, color: sub, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</p>
                    <p style={{ fontSize: 16, fontWeight: 600, margin: 0, fontFamily: 'monospace' }}>{event.wifi_password}</p>
                  </div>
                  <button onClick={() => copy(event.wifi_password, 'password')}
                    style={{ fontSize: 12, color: '#9D2235', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                    {copied === 'password' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
