import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/api/password/request', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/attache-logo.png" alt="Attache Group" style={{ height: 64, margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Event Management</p>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #D5D5D4', padding: '2rem' }}>
          {submitted ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: '1rem' }}>📧</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#262D33', margin: '0 0 0.75rem' }}>Check your email</h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
                If that email address is registered, you'll receive a password reset link shortly. Check your spam folder if you don't see it.
              </p>
              <Link to="/techshow" style={{ fontSize: 14, color: '#9D2235', fontWeight: 600, textDecoration: 'none' }}>← Back to sign in</Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#262D33', margin: '0 0 0.5rem' }}>Reset your password</h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 1.5rem' }}>Enter your email address and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' }}
                    placeholder="you@example.com" autoFocus />
                </div>
                {error && <p style={{ color: '#9D2235', backgroundColor: '#fdf0f2', border: '1px solid #f5c6cc', borderRadius: 8, padding: '8px 12px', fontSize: 13, margin: 0 }}>{error}</p>}
                <button type="submit" disabled={loading}
                  style={{ padding: '10px', borderRadius: 8, border: 'none', backgroundColor: '#9D2235', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: '1rem' }}>
                <Link to="/techshow" style={{ color: '#9D2235', fontWeight: 600, textDecoration: 'none' }}>← Back to sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
