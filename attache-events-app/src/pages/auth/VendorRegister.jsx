import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export default function VendorRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ company_name: '', email: '', password: '', confirm: '', access_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) { setForm(p => ({ ...p, [e.target.name]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault(); setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (form.access_code !== 'SHOWCASE2026') { setError('Invalid access code'); return; }
    setLoading(true);
    try {
      await api.post('/api/auth/vendor/register', { company_name: form.company_name, email: form.email, password: form.password });
      navigate('/login');
    } catch (err) { setError(err.response?.data?.error || 'Registration failed'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/attache-logo.png" alt="Attache Group" style={{ height: 64, margin: '0 auto 1rem' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>Vendor Registration</p>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #D5D5D4', padding: '2rem' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: '1.5rem', color: '#262D33' }}>Create vendor account</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[['company_name','Company name','text','Your company name'],['email','Email','email','you@company.com'],['password','Password','password','Min 8 characters'],['confirm','Confirm password','password','Repeat password'],['access_code','Access code','text','Event access code']].map(([name, label, type, placeholder]) => (
              <div key={name}><label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{label}</label>
                <input type={type} name={name} value={form[name]} onChange={handleChange} required placeholder={placeholder}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }} /></div>
            ))}
            {error && <p style={{ color: '#9D2235', backgroundColor: '#fdf0f2', border: '1px solid #f5c6cc', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>{error}</p>}
            <button type="submit" disabled={loading}
              style={{ padding: '10px', borderRadius: 8, border: 'none', backgroundColor: '#9D2235', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: '1rem' }}>
            Already have an account? <a href="/login" style={{ color: '#9D2235', fontWeight: 600 }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}
