import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { getCached, setCached } from '../../services/api';

const VERSION = '3.42';

export default function AttendeeLogin() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', event_select: '' });
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(() => {
    const saved = sessionStorage.getItem('_attendeeLoginError');
    if (saved) { sessionStorage.removeItem('_attendeeLoginError'); return saved; }
    return '';
  });

  useEffect(() => {
    // Clear any admin/vendor/monitor session — they should use /manage
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role !== 'attendee') {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } catch {}
    }
    const cached = getCached('events');
    if (cached) { setEvents(cached); return; }
    api.get('/api/events').then(r => { setEvents(r.data); setCached('events', r.data); }).catch(console.error);
  }, []);

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) { setError(''); sessionStorage.removeItem('_attendeeLoginError'); }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const data = await login('/api/auth/attendee/login', {
        email: form.email, password: form.password, event_id: form.event_select
      });
      navigate('/attendee');
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      sessionStorage.setItem('_attendeeLoginError', msg);
      setError(msg);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/attache-logo.png" alt="Attache Group" style={{ height: 64, margin: '0 auto 1rem', display: 'block' }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#262D33', margin: '0 0 4px' }}>London Technology Showcase</h1>
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Attendee Portal</p>
          <p style={{ color: '#9D2235', fontSize: 11, fontWeight: 600, margin: '4px 0 0', letterSpacing: '0.05em' }}>v{VERSION}</p>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #D5D5D4', padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Select event</label>
              <select name="event_select" value={form.event_select} onChange={handleChange} required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }}>
                <option value="">Choose your event...</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }}
                placeholder="you@example.com" autoComplete="email" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }}
                placeholder="••••••••" autoComplete="current-password" />
            </div>

            {error && (
              <div style={{ color: '#9D2235', backgroundColor: '#fdf0f2', border: '2px solid #9D2235', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontWeight: 600, textAlign: 'center' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ padding: '10px', borderRadius: 8, border: 'none', backgroundColor: '#9D2235', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/attendee/set-password" style={{ display: 'block', textAlign: 'center', padding: '12px', borderRadius: 8, border: '2px solid #9D2235', color: '#9D2235', fontWeight: 700, fontSize: 15, textDecoration: 'none', backgroundColor: '#fdf0f2' }}>
              🔑 First time here? Set your password
            </Link>
            <Link to="/forgot-password" style={{ display: 'block', textAlign: 'center', padding: '10px', borderRadius: 8, border: '1px solid #D5D5D4', color: '#6b7280', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
              Forgot your password? Reset it
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
