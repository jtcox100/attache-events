import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/AppHeader';
import api from '../../services/api';

const BTN = "px-4 py-2 text-white text-sm rounded-lg transition-colors";
const BTN_BRAND = { backgroundColor: '#9D2235' };
const BTN_DARK = { backgroundColor: '#262D33' };
const BTN_TEAL = { backgroundColor: '#185676' };


function WalkinModal({ eventId, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', company: '', title: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #D5D5D4', fontSize: 14, boxSizing: 'border-box', marginTop: 4 };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.company.trim() || !form.title.trim()) {
      setMsg('All fields are required'); return;
    }
    setLoading(true); setMsg('');
    try {
      const { data } = await api.post('/api/attendees/walkin', { event_id: eventId, ...form });
      setMsg(`✓ ${data.name} added and checked in`);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Failed to add attendee');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 420 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#262D33', margin: '0 0 1.25rem' }}>Add Walk-in Attendee</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Full name *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={inputStyle} placeholder="First and last name" autoFocus />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputStyle} placeholder="their@email.com" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Company *</label>
            <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} style={inputStyle} placeholder="Organization name" />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Title *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} placeholder="Job title" />
          </div>
          {msg && <p style={{ fontSize: 13, fontWeight: 500, color: msg.startsWith('✓') ? '#2d6a2d' : '#9D2235', margin: 0 }}>{msg}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="submit" disabled={loading}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', backgroundColor: '#9D2235', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Adding...' : 'Add & Check In'}
            </button>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #D5D5D4', backgroundColor: '#fff', fontSize: 14, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const eventId = user?.event_id;

  const [summary, setSummary] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [checkinMsg, setCheckinMsg] = useState('');
  const [syncMsg, setSyncMsg] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [showWalkin, setShowWalkin] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [scanMsgType, setScanMsgType] = useState('success');
  const scanRef = useRef(null);

  useEffect(() => { if (eventId) loadDashboard(); }, [eventId]);

  async function loadDashboard() {
    try {
      const [s, c] = await Promise.all([
        api.get(`/api/reports/summary/${eventId}`),
        api.get(`/api/checkin/recent/${eventId}`)
      ]);
      setSummary(s.data); setSessions(s.data.sessions || []); setRecentCheckins(c.data || []);
    } catch (err) { console.error(err); }
  }

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2 || !eventId) {
      setSearchResults([]); setSearchResult(null); setSearchError(''); return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchError('');
        const { data } = await api.get('/api/attendees/search', { params: { event_id: eventId, q: searchQuery.trim() } });
        setSearchResults(data); setSearchResult(null);
        if (data.length === 0) setSearchError('No attendees found');
      } catch { setSearchError('Search failed'); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, eventId]);

  function selectAttendee(a) { setSearchResult(a); setSearchResults([]); setSearchQuery(a.name); }

  async function handleCheckin() {
    if (!searchResult) return;
    try {
      await api.post('/api/checkin', { attendee_id: searchResult.id, event_id: eventId });
      setCheckinMsg(`${searchResult.name} checked in`);
      setSearchResult(null); setSearchQuery(''); loadDashboard();
      setTimeout(() => setCheckinMsg(''), 3000);
    } catch (err) { setCheckinMsg(err.response?.data?.error || 'Failed'); setTimeout(() => setCheckinMsg(''), 3000); }
  }

  async function handleUndoCheckin() {
    if (!searchResult) return;
    try {
      await api.delete(`/api/checkin/${searchResult.id}`, { data: { event_id: eventId } });
      setCheckinMsg(`Check-in reversed for ${searchResult.name}`);
      setSearchResult(prev => ({ ...prev, checked_in_at: null })); loadDashboard();
      setTimeout(() => setCheckinMsg(''), 3000);
    } catch (err) { setCheckinMsg(err.response?.data?.error || 'Failed'); setTimeout(() => setCheckinMsg(''), 3000); }
  }

  async function handleSync() {
    setSyncMsg('Syncing...');
    try {
      const { data } = await api.post(`/api/sync/eventbrite/${eventId}`);
      setSyncMsg(`Sync complete — ${data.created} new, ${data.updated} updated`);
      setTimeout(() => setSyncMsg(''), 5000);
    } catch (err) { setSyncMsg(err.response?.data?.error || 'Sync failed'); setTimeout(() => setSyncMsg(''), 4000); }
  }

  function handlePrintPasswordReset() {
    const url = `${import.meta.env.VITE_API_URL ? window.location.origin : 'https://attache-events.pages.dev'}/forgot-password`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/forgot-password')}`;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Password Reset QR Code</title>
        <style>
          body { font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; }
          .card { text-align: center; padding: 2rem; border: 2px solid #9D2235; border-radius: 12px; max-width: 320px; }
          img.logo { height: 48px; margin-bottom: 1rem; }
          h2 { color: #262D33; margin: 0 0 0.5rem; font-size: 20px; }
          p { color: #6b7280; font-size: 14px; margin: 0 0 1rem; line-height: 1.5; }
          img.qr { width: 200px; height: 200px; margin: 1rem auto; display: block; }
          .url { font-size: 11px; color: #9ca3af; word-break: break-all; margin-top: 0.5rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <img class="logo" src="${window.location.origin}/attache-logo.png" alt="Attache Group" />
          <h2>Forgot your password?</h2>
          <p>Scan this QR code to reset your London Technology Showcase app password.</p>
          <img class="qr" src="${qrUrl}" alt="QR Code" onload="window.print()" />
          <p class="url">${window.location.origin}/forgot-password</p>
        </div>
      </body>
      </html>
    `);
    win.document.close();
  }

  async function handleScan(e) {
    if (e.key !== 'Enter') return;
    const code = scanInput.trim();
    setScanInput('');
    if (!code) return;

    try {
      // Ensure code is treated as string — large numbers get converted to scientific notation
      const codeStr = String(code).trim();
      console.log('[scanner] scanned code:', JSON.stringify(codeStr), 'length:', codeStr.length);
      const { data: allAttendees } = await api.get(`/api/attendees/by-qr`, { params: { qr_code: codeStr, event_id: eventId } });
      console.log('[scanner] by-qr result:', JSON.stringify(allAttendees));
      const attendee = allAttendees || null;
      console.log('[scanner] attendee found:', attendee ? attendee.name : 'null');

      if (!attendee) {
        setScanMsg('QR code not found'); setScanMsgType('error');
        setTimeout(() => setScanMsg(''), 3000); return;
      }
      if (attendee.checked_in_at) {
        setScanMsg(`${attendee.name} already checked in`); setScanMsgType('warn');
        setTimeout(() => setScanMsg(''), 3000); return;
      }

      await api.post('/api/checkin', { attendee_id: attendee.id, event_id: eventId });
      setScanMsg(`✓ ${attendee.name} checked in`); setScanMsgType('success');
      loadDashboard();
      setTimeout(() => setScanMsg(''), 4000);
    } catch (err) {
      setScanMsg(err.response?.data?.error || 'Check-in failed'); setScanMsgType('error');
      setTimeout(() => setScanMsg(''), 3000);
    }
    scanRef.current?.focus();
  }

  async function handleResetScans() {
    if (!window.confirm('Reset all session scan data? This cannot be undone.')) return;
    try {
      const { data } = await api.delete(`/api/reports/reset-scans/${eventId}`);
      setSyncMsg(data.message);
      setTimeout(() => setSyncMsg(''), 4000);
    } catch (err) { setSyncMsg('Reset failed'); setTimeout(() => setSyncMsg(''), 3000); }
  }

  async function handleBadgePreview() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/badges/preview/${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { alert('No attendees found'); return; }
    window.open(URL.createObjectURL(await res.blob()), '_blank');
  }

  async function handleBadgeExport() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/badges/event/${eventId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { alert('Failed'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(await res.blob()); a.download = 'badges.pdf'; a.click();
  }

  async function handleExport(type) {
    const urls = {
      checkins: `/api/reports/checkins/${eventId}`,
      bySession: `/api/reports/attendance-by-session/${eventId}`,
      byAttendee: `/api/reports/attendance-by-attendee/${eventId}`,
      noShows: `/api/reports/no-shows/${eventId}`
    };
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}${urls[type]}`, { headers: { Authorization: `Bearer ${token}` } });
    const a = document.createElement('a'); a.href = URL.createObjectURL(await res.blob()); a.download = `${type}.csv`; a.click();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {showWalkin && <WalkinModal eventId={eventId} onClose={() => setShowWalkin(false)} onSuccess={loadDashboard} />}
      <AppHeader title="Admin Dashboard" />

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Action buttons */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button onClick={handleSync} className={BTN} style={BTN_DARK}>Sync Eventbrite</button>
          <a href="/admin/setup" className={BTN} style={{ ...BTN_BRAND, textDecoration: 'none' }}>Event Setup</a>
          <a href={`/admin/registrations/${eventId}`} className={BTN} style={{ ...BTN_TEAL, textDecoration: 'none' }}>Registrations</a>
          <a href={`/admin/live-attendance/${eventId}`} className={BTN} style={{ ...BTN_TEAL, textDecoration: 'none' }}>Live Attendance</a>
          <button onClick={handleResetScans} className={BTN} style={{ backgroundColor: '#6b7280' }}>Reset Scans</button>
          <button onClick={handlePrintPasswordReset} className={BTN} style={{ backgroundColor: '#6b7280' }}>Password Reset QR</button>
          <a href="/admin/messages" className={BTN} style={{ ...BTN_TEAL, textDecoration: 'none' }}>Messages</a>
          <a href="/admin/speakers" className={BTN} style={{ ...BTN_TEAL, textDecoration: 'none' }}>Speakers</a>
          <a href="/admin/partners" className={BTN} style={{ ...BTN_TEAL, textDecoration: 'none' }}>Solution Partners</a>
          <a href="/admin/survey-results" className={BTN} style={{ ...BTN_TEAL, textDecoration: 'none' }}>Survey Results</a>
          <a href="/admin/single-badge" className={BTN} style={{ ...BTN_TEAL, textDecoration: 'none' }}>Print Single Badge</a>
          <button onClick={handleBadgePreview} className={BTN} style={BTN_TEAL}>Preview Badge</button>
          <button onClick={handleBadgeExport} className={BTN} style={BTN_DARK}>Generate Badges</button>
          {syncMsg && <span className="text-sm text-gray-600">{syncMsg}</span>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Check-in panel */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#D5D5D4' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>Attendee check-in</h2>
            {/* USB Scanner input — always focused */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Badge Scanner</label>
                <button onClick={() => { setShowWalkin(true); setWalkinMsg(''); }}
                  className="text-xs px-3 py-1 rounded-lg text-white font-semibold"
                  style={{ backgroundColor: '#9D2235', border: 'none', cursor: 'pointer' }}>
                  + Walk-in
                </button>
              </div>
              <div className="relative">
                <input ref={scanRef} type="text" inputMode="text" value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  onKeyDown={handleScan}
                  autoFocus
                  autoComplete="off"
                  placeholder="Scan badge QR code here..."
                  className="w-full px-3 py-2 border-2 rounded-lg text-sm focus:outline-none"
                  style={{ borderColor: '#9D2235', backgroundColor: '#fdf8f8' }} />
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>📷</span>
              </div>
              {scanMsg && (
                <p className="text-sm mt-2 font-medium" style={{ color: scanMsgType === 'success' ? '#2d6a2d' : scanMsgType === 'warn' ? '#856404' : '#9D2235' }}>
                  {scanMsg}
                </p>
              )}
            </div>
            <div className="relative mb-4">
              <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setSearchResult(null); }}
                placeholder="Search by name, email or company..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" style={{ borderColor: '#D5D5D4' }} />
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg" style={{ borderColor: '#D5D5D4' }}>
                  {searchResults.map(a => (
                    <button key={a.id} onClick={() => selectAttendee(a)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0" style={{ borderColor: '#f0f0f0' }}>
                      <p className="text-sm font-medium text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-500">{a.email} · {a.company}</p>
                      {a.checked_in_at && <p className="text-xs" style={{ color: '#9D2235' }}>Already checked in</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {searchError && <p className="text-sm mb-3" style={{ color: '#9D2235' }}>{searchError}</p>}
            {searchResult && (
              <div className="border rounded-lg p-4 mb-4" style={{ borderColor: searchResult.checked_in_at ? '#9D2235' : '#185676', backgroundColor: searchResult.checked_in_at ? '#fdf0f2' : '#f0f5fa' }}>
                <p className="font-medium text-gray-900">{searchResult.name}</p>
                <p className="text-sm text-gray-500">{searchResult.email} · {searchResult.company}</p>
                {searchResult.checked_in_at ? (
                  <div className="mt-3 flex items-center gap-3">
                    <p className="text-sm" style={{ color: '#9D2235' }}>Checked in at {new Date(searchResult.checked_in_at).toLocaleTimeString()}</p>
                    <button onClick={handleUndoCheckin} className="px-3 py-1.5 text-xs rounded-lg border" style={{ borderColor: '#9D2235', color: '#9D2235' }}>Undo</button>
                  </div>
                ) : (
                  <button onClick={handleCheckin} className={`mt-3 ${BTN}`} style={BTN_BRAND}>Mark as arrived</button>
                )}
              </div>
            )}
            {checkinMsg && <p className="text-sm mb-3 text-gray-600">{checkinMsg}</p>}
            {summary?.checkin && (
              <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: '#f5f5f5' }}>
                <p className="text-sm font-medium" style={{ color: '#262D33' }}>
                  {summary.checkin.total_checked_in} / {summary.checkin.total_registered} checked in
                  <span className="text-gray-500 ml-2">({summary.checkin.checkin_pct}%)</span>
                </p>
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recent arrivals</h3>
            <div className="space-y-1">
              {recentCheckins.slice(0, 8).map((c, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-900">{c.attendees?.name}</span>
                  <span className="text-gray-400">{new Date(c.checked_in_at).toLocaleTimeString()}</span>
                </div>
              ))}
              {recentCheckins.length === 0 && <p className="text-sm text-gray-400">No check-ins yet</p>}
            </div>
          </div>

          {/* Session Registrations panel */}
          <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#D5D5D4' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>Session Registrations</h2>
            <div className="space-y-3">
              {sessions.map(s => (
                <div key={s.session_id} className="border rounded-lg p-3" style={{ borderColor: '#f0f0f0' }}>
                  <div className="flex justify-between items-start mb-1 gap-3">
                    <p className="text-sm font-medium text-gray-900 flex-1 min-w-0">{s.title}</p>
                    <span className="text-sm text-gray-500 shrink-0 whitespace-nowrap">{s.registered_count} / {s.capacity}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{s.room_name} · {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#f0f0f0' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, (s.registered_count / s.capacity) * 100)}%`, backgroundColor: '#9D2235' }} />
                  </div>
                </div>
              ))}
              {sessions.length === 0 && <p className="text-sm text-gray-400">No sessions found</p>}
            </div>

            <div className="mt-6 border-t pt-4" style={{ borderColor: '#f0f0f0' }}>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Post-event exports</h3>
              <div className="grid grid-cols-2 gap-2">
                {[['checkins','Check-in list'],['bySession','By session'],['byAttendee','By attendee'],['noShows','No-shows']].map(([type, label]) => (
                  <button key={type} onClick={() => handleExport(type)} className="px-3 py-2 text-xs rounded-lg border text-gray-700 hover:bg-gray-50" style={{ borderColor: '#D5D5D4' }}>{label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
