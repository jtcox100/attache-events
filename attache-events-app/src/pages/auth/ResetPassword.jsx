import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [name, setName] = useState('');
  const [tokenValid, setTokenValid] = useState(null);
  const [tokenError, setTokenError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) { setTokenValid(false); setTokenError('No reset token found. Please request a new link.'); return; }
    api.get(`/api/password/validate/${token}`)
      .then(r => { setTokenValid(true); setName(r.data.name); })
      .catch(err => { setTokenValid(false); setTokenError(err.response?.data?.error || 'Invalid or expired link'); });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await api.post('/api/password/reset', { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally { setLoading(false); }
  }

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem', backgroundColor: '#f5f5f5' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/attache-logo.png" alt="Attache Group" style={{ height: 64, margin: '0 auto 1rem', display: 'block' }} />
          <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>Event Management</p>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: 12, border: '1px solid #D5D5D4', padding: '2rem' }}>
          {tokenValid === null && <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 14 }}>Validating your link...</p>}

          {tokenValid === false && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: '1rem' }}>⚠️</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#262D33', margin: '0 0 0.75rem' }}>Link invalid or expired</h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 1.5rem' }}>{tokenError}</p>
              <Link to="/forgot-password" style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 8, backgroundColor: '#9D2235', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                Request a new link
              </Link>
            </div>
          )}

          {tokenValid === true && success && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: '1rem' }}>✅</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#262D33', margin: '0 0 0.75rem' }}>Password updated!</h2>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 1.5rem' }}>Your password has been changed successfully.</p>
              <Link to="/techshow" style={{ display: 'inline-block', padding: '10px 20px', borderRadius: 8, backgroundColor: '#9D2235', color: '#fff', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
                Sign in
              </Link>
            </div>
          )}

          {tokenValid === true && !success && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#262D33', margin: '0 0 0.5rem' }}>Set new password</h2>
              {name && <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 1.5rem' }}>Hi {name} — choose a new password below.</p>}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>New password</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="At least 6 characters" autoFocus />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Confirm password</label>
                  <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required style={inputStyle} placeholder="Repeat your password" />
                </div>
                {error && <p style={{ color: '#9D2235', backgroundColor: '#fdf0f2', border: '1px solid #f5c6cc', borderRadius: 8, padding: '8px 12px', fontSize: 13, margin: 0 }}>{error}</p>}
                <button type="submit" disabled={loading}
                  style={{ padding: '10px', borderRadius: 8, border: 'none', backgroundColor: '#9D2235', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
                  {loading ? 'Updating...' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
