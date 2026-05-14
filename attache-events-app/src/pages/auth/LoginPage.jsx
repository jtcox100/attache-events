import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api, { getCached, setCached } from '../../services/api';

const VERSION = '3.03';

const ROLES = [
  { label: 'Admin', value: 'admin', endpoint: '/api/auth/admin/login', fields: ['email', 'password', 'event_select'] },
  { label: 'Attendee', value: 'attendee', endpoint: '/api/auth/attendee/login', fields: ['email', 'password', 'event_select'] },
  { label: 'Monitor', value: 'monitor', endpoint: '/api/auth/monitor/login', fields: ['event_select', 'pin'] },
  { label: 'Vendor', value: 'vendor', endpoint: '/api/auth/vendor/login', fields: ['email', 'password'] },
];
const ROLE_REDIRECTS = { admin: '/admin', attendee: '/attendee', monitor: '/monitor', vendor: '/vendor' };

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(ROLES[0]);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);

  // Restore error from sessionStorage if page remounted after failed login
  const [error, setError] = useState(() => {
    const saved = sessionStorage.getItem('_loginError');
    if (saved) { sessionStorage.removeItem('_loginError'); return saved; }
    return '';
  });

  useEffect(() => { const cached = getCached('events');
    if (cached) { setEvents(cached); return; }
    api.get('/api/events').then(r => { setEvents(r.data); setCached('events', r.data); }).catch(console.error); }, []);

  function handleRoleChange(role) { setSelectedRole(role); setForm({}); setError(''); sessionStorage.removeItem('_loginError'); }
  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) { setError(''); sessionStorage.removeItem('_loginError'); }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const payload = { ...form };
      if (payload.event_select) { payload.event_id = payload.event_select; delete payload.event_select; }
      const data = await login(selectedRole.endpoint, payload);
      navigate(ROLE_REDIRECTS[data.role] || '/');
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      sessionStorage.setItem('_loginError', msg);
      setError(msg);
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/attache-logo.png" alt="Attache Group" style={{ height: 64, margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Event Management</p>
          <p style={{ color: '#9D2235', fontSize: 11, fontWeight: 600, margin: '4px 0 0', letterSpacing: '0.05em' }}>v{VERSION}</p>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #D5D5D4', padding: '2rem' }}>
          <div style={{ display: 'flex', backgroundColor: '#f5f5f5', borderRadius: 8, padding: 4, marginBottom: '1.5rem' }}>
            {ROLES.map(role => (
              <button key={role.value} onClick={() => handleRoleChange(role)}
                style={{ flex: 1, padding: '6px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
                  backgroundColor: selectedRole.value === role.value ? '#9D2235' : 'transparent',
                  color: selectedRole.value === role.value ? '#fff' : '#666',
                  fontWeight: selectedRole.value === role.value ? 600 : 400 }}>
                {role.label}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {selectedRole.fields.includes('email') && (
              <div><label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Email</label>
                <input type="email" name="email" value={form.email || ''} onChange={handleChange} required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }} placeholder="you@example.com" /></div>
            )}
            {selectedRole.fields.includes('password') && (
              <div><label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Password</label>
                <input type="password" name="password" value={form.password || ''} onChange={handleChange} required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }} placeholder="••••••••" /></div>
            )}
            {selectedRole.fields.includes('event_select') && (
              <div><label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Select event</label>
                <select name="event_select" value={form.event_select || ''} onChange={handleChange} required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }}>
                  <option value="">Choose your event...</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.name} — {e.event_date}</option>)}
                </select></div>
            )}
            {selectedRole.fields.includes('pin') && (
              <div><label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>PIN</label>
                <input type="password" name="pin" value={form.pin || ''} onChange={handleChange} required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }} placeholder="Enter PIN" /></div>
            )}
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
          {selectedRole.value === 'vendor' && (
            <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                New vendor? <Link to="/vendor/register" style={{ color: '#9D2235', fontWeight: 600 }}>Create an account</Link>
              </p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Forgot your password? <Link to="/vendor/forgot-password" style={{ color: '#9D2235', fontWeight: 600 }}>Reset it</Link>
              </p>
            </div>
          )}
          {selectedRole.value === 'attendee' && (
            <div style={{ textAlign: 'center', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                First time? <Link to="/attendee/set-password" style={{ color: '#9D2235', fontWeight: 600 }}>Set your password</Link>
              </p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Forgot your password? <Link to="/forgot-password" style={{ color: '#9D2235', fontWeight: 600 }}>Reset it</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
