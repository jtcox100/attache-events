import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function VendorRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ company_name: '', email: '', password: '', confirm: '', access_code: '', event_id: '' });
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/api/events').then(r => setEvents(r.data || [])).catch(console.error);
  }, []);

  function handleChange(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.event_id) { setError('Please select your event'); return; }
    if (!form.company_name.trim()) { setError('Company name is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (!form.access_code.trim()) { setError('Access code is required'); return; }

    setLoading(true);
    try {
      await api.post('/api/auth/vendor/register', {
        company_name: form.company_name,
        email: form.email,
        password: form.password,
        access_code: form.access_code,
        event_id: form.event_id
      });
      navigate('/manage?registered=true');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  }

  const INPUT = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' };
  const LBL = { display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/attache-logo.png" alt="Attache Group" style={{ height: 56, margin: '0 auto 0.75rem', display: 'block' }} />
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Vendor Portal — Create Account</p>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #D5D5D4', padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={LBL}>Event</label>
              <select name="event_id" value={form.event_id} onChange={handleChange} required style={INPUT}>
                <option value="">Select your event...</option>
                {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Access code</label>
              <input type="text" name="access_code" value={form.access_code} onChange={handleChange} required style={INPUT} placeholder="Provided by event organizer" />
            </div>
            <div>
              <label style={LBL}>Company name</label>
              <input type="text" name="company_name" value={form.company_name} onChange={handleChange} required style={INPUT} placeholder="Your company name" />
            </div>
            <div>
              <label style={LBL}>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required style={INPUT} placeholder="you@company.com" />
            </div>
            <div>
              <label style={LBL}>Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required style={INPUT} placeholder="Min 8 characters" />
            </div>
            <div>
              <label style={LBL}>Confirm password</label>
              <input type="password" name="confirm" value={form.confirm} onChange={handleChange} required style={INPUT} placeholder="Repeat password" />
            </div>
            {error && <p style={{ color: '#9D2235', backgroundColor: '#fdf0f2', border: '1px solid #f5c6cc', borderRadius: 8, padding: '8px 12px', fontSize: 13, margin: 0 }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ padding: '10px', borderRadius: 8, border: 'none', backgroundColor: '#9D2235', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1, marginTop: '0.25rem' }}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: '1rem' }}>
            Already have an account? <Link to="/manage" style={{ color: '#9D2235', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
