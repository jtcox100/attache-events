import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/AppHeader';
import api from '../../services/api';

export default function AdminSingleBadge() {
  const { user } = useAuth();
  const eventId = user?.event_id;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [position, setPosition] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/api/attendees/search', { params: { event_id: eventId, q: query } });
        setResults(data || []);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, eventId]);

  function selectAttendee(a) {
    setSelected(a);
    setQuery(a.name);
    setResults([]);
  }

  async function handlePrint() {
    if (!selected) { setMsg('Please select an attendee'); return; }
    setLoading(true); setMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/badges/single/${eventId}/${selected.id}?position=${position}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Failed to generate badge');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) win.focus();
      setMsg('Badge opened — use your browser print dialog to print');
      setTimeout(() => setMsg(''), 5000);
    } catch (err) {
      setMsg(err.message || 'Failed');
    } finally { setLoading(false); }
  }

  // Visual grid showing label positions
  const POSITIONS = [1, 2, 3, 4, 5, 6];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Print Single Badge" backLink="/admin" backLabel="Dashboard" />
      <div className="max-w-lg mx-auto px-6 py-8">

        {/* Attendee search */}
        <div className="bg-white rounded-xl border p-6 mb-6" style={{ borderColor: '#D5D5D4' }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>1. Select Attendee</h2>
          <div className="relative">
            <input ref={searchRef} type="text" value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null); }}
              placeholder="Search by name, email or company..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
              style={{ borderColor: '#D5D5D4' }} autoFocus />
            {results.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg" style={{ borderColor: '#D5D5D4' }}>
                {results.map(a => (
                  <button key={a.id} onClick={() => selectAttendee(a)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0 text-sm" style={{ borderColor: '#f0f0f0' }}>
                    <p className="font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-500">{a.company} · {a.title}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <div className="mt-3 p-3 rounded-lg text-sm" style={{ backgroundColor: '#f0f7f0', border: '1px solid #2d6a2d' }}>
              <p className="font-semibold" style={{ color: '#2d6a2d' }}>✓ {selected.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{selected.company} · {selected.title}</p>
            </div>
          )}
        </div>

        {/* Position selector */}
        <div className="bg-white rounded-xl border p-6 mb-6" style={{ borderColor: '#D5D5D4' }}>
          <h2 className="text-base font-semibold mb-2" style={{ color: '#262D33' }}>2. Select Label Position</h2>
          <p className="text-xs text-gray-500 mb-4">Choose which of the 6 label positions on the sheet to print on</p>

          {/* Visual 2x3 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxWidth: 280 }}>
            {POSITIONS.map(p => (
              <button key={p} onClick={() => setPosition(p)}
                style={{
                  padding: '12px 8px', borderRadius: 8, border: `2px solid ${position === p ? '#9D2235' : '#D5D5D4'}`,
                  backgroundColor: position === p ? '#9D2235' : '#fff',
                  color: position === p ? '#fff' : '#262D33',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
                }}>
                <span style={{ fontSize: 18 }}>{position === p ? '✓' : '□'}</span>
                <span>Position {p}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>
                  {p <= 2 ? 'Top' : p <= 4 ? 'Middle' : 'Bottom'} {p % 2 === 1 ? 'Left' : 'Right'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Print button */}
        {msg && (
          <p className="text-sm font-medium mb-4 text-center" style={{ color: msg.includes('opened') ? '#2d6a2d' : '#9D2235' }}>{msg}</p>
        )}
        <button onClick={handlePrint} disabled={loading || !selected}
          className="w-full py-3 rounded-xl text-white font-bold text-base"
          style={{ backgroundColor: selected ? '#9D2235' : '#D5D5D4', border: 'none', cursor: selected ? 'pointer' : 'not-allowed', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Generating...' : '🖨️ Generate & Print Badge'}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">Opens a PDF in a new tab — use your browser's print dialog to send to your printer</p>
      </div>
    </div>
  );
}
