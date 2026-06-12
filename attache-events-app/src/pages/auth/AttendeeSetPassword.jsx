import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function AttendeeSetPassword() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ email: '', event_id: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/api/events').then(r => setEvents(r.data)).catch(console.error); }, []);
  function handleChange(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await api.post('/api/auth/attendee/set-password', { email: form.email, event_id: form.event_id, password: form.password });
      navigate('/login');
    } catch (err) { setError(err.response?.data?.error || 'Failed to set password'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/attache-logo.png" alt="Attache Group" style={{ height: 64, margin: '0 auto 1rem' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Set your password</p>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #D5D5D4', padding: '2rem' }}>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: '1.5rem' }}>You were registered via Eventbrite. Set a password to access the event app.</p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div><label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Email (used on Eventbrite)</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Select event</label>
              <select name="event_id" value={form.event_id} onChange={handleChange} required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }}>
                <option value="">Choose your event...</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.name} — {e.event_date}</option>)}
              </select></div>
            <div><label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>New password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required placeholder="Min 8 characters"
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }} /></div>
            <div><label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Confirm password</label>
              <input type="password" name="confirm" value={form.confirm} onChange={handleChange} required
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }} /></div>
            {error && <p style={{ color: '#9D2235', backgroundColor: '#fdf0f2', border: '1px solid #f5c6cc', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ padding: '10px', borderRadius: 8, border: 'none', backgroundColor: '#9D2235', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Setting...' : 'Set password'}
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: '1rem' }}>
            Already set? <a href="/login" style={{ color: '#9D2235', fontWeight: 600 }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
