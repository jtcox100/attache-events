import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/AppHeader';
import api from '../../services/api';

export default function AdminSingleBadge() {
  const { user } = useAuth();
  const eventId = user?.event_id;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [queue, setQueue] = useState([]); // list of people to print
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        // Search attendees, speakers, and exhibitors in parallel
        const [attendeesRes, speakersRes, exhibitorsRes] = await Promise.allSettled([
          api.get('/api/attendees/search', { params: { event_id: eventId, q: query } }),
          api.get(`/api/speakers/event/${eventId}`),
          api.get(`/api/exhibitors/event/${eventId}`)
        ]);

        const attendees = (attendeesRes.status === 'fulfilled' ? attendeesRes.value.data || [] : [])
          .map(a => ({ ...a, _type: 'attendee' }));

        const speakers = (speakersRes.status === 'fulfilled' ? speakersRes.value.data || [] : [])
          .filter(s => s.name?.toLowerCase().includes(query.toLowerCase()))
          .map(s => ({ id: s.id, name: s.name, company: s.company || '', title: s.title || '', qr_code: s.id, _type: 'speaker', is_partner: true, partner_logo_url: null }));

        const exhibitors = (exhibitorsRes.status === 'fulfilled' ? exhibitorsRes.value.data || [] : [])
          .filter(e => e.name?.toLowerCase().includes(query.toLowerCase()))
          .map(e => ({ id: e.id, name: e.name, company: e.partners?.name || '', title: e.title || '', qr_code: e.id, _type: 'exhibitor', is_partner: true, partner_logo_url: e.partners?.logo_url || null }));

        setResults([...attendees, ...speakers, ...exhibitors].slice(0, 15));
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, eventId]);

  function addToQueue(person) {
    // Don't add duplicates
    if (queue.find(p => p.id === person.id && p._type === person._type)) return;
    setQueue(prev => [...prev, person]);
    setQuery('');
    setResults([]);
    searchRef.current?.focus();
  }

  function removeFromQueue(idx) {
    setQueue(prev => prev.filter((_, i) => i !== idx));
  }

  function typeLabel(type) {
    if (type === 'speaker') return 'Speaker';
    if (type === 'exhibitor') return 'Exhibitor';
    return 'Attendee';
  }

  async function handlePrint() {
    if (queue.length === 0) { setMsg('Add at least one person to print'); return; }
    setLoading(true); setMsg('');
    try {
      const token = localStorage.getItem('token');
      // Get event data for logo
      const eventRes = await api.get(`/api/events/${eventId}`);
      const event = eventRes.data;

      // Call a new endpoint that accepts an array of people
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/badges/adhoc/${eventId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ people: queue })
      });
      if (!res.ok) throw new Error('Failed to generate badges');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'adhoc-badges.pdf';
      a.click();
      setMsg(`✓ ${queue.length} badge${queue.length !== 1 ? 's' : ''} generated`);
      setTimeout(() => setMsg(''), 4000);
    } catch (err) {
      setMsg(err.message || 'Failed to generate');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Ad-Hoc Badge Print" backLink="/admin" backLabel="Dashboard" />
      <div className="max-w-lg mx-auto px-6 py-8">

        {/* Search */}
        <div className="bg-white rounded-xl border p-6 mb-4" style={{ borderColor: '#D5D5D4' }}>
          <h2 className="text-base font-semibold mb-1" style={{ color: '#262D33' }}>Search &amp; Add</h2>
          <p className="text-xs text-gray-400 mb-3">Search attendees, speakers, and exhibitors</p>
          <div className="relative">
            <input ref={searchRef} type="text" value={query}
              onChange={e => { setQuery(e.target.value); }}
              placeholder="Search by name..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
              style={{ borderColor: '#D5D5D4' }} autoFocus />
            {results.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg overflow-hidden" style={{ borderColor: '#D5D5D4' }}>
                {results.map((r, i) => (
                  <button key={`${r._type}-${r.id}`} onClick={() => addToQueue(r)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b last:border-0 text-sm flex items-center justify-between"
                    style={{ borderColor: '#f0f0f0' }}>
                    <div>
                      <p className="font-medium text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-500">{r.company}{r.title ? ` · ${r.title}` : ''}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full ml-2 shrink-0"
                      style={{ backgroundColor: r._type === 'attendee' ? '#f0f5fa' : r._type === 'speaker' ? '#f0f7f0' : '#fdf8ee',
                        color: r._type === 'attendee' ? '#185676' : r._type === 'speaker' ? '#2d6a2d' : '#856404' }}>
                      {typeLabel(r._type)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Queue */}
        <div className="bg-white rounded-xl border p-6 mb-4" style={{ borderColor: '#D5D5D4' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: '#262D33' }}>Print Queue</h2>
            {queue.length > 0 && (
              <button onClick={() => setQueue([])} className="text-xs text-gray-400 hover:text-red-500">Clear all</button>
            )}
          </div>
          {queue.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No badges queued — search above to add people</p>
          ) : (
            <div className="space-y-2">
              {queue.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg"
                  style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.company || ''} · <span style={{ color: p._type === 'attendee' ? '#185676' : p._type === 'speaker' ? '#2d6a2d' : '#856404' }}>{typeLabel(p._type)}</span></p>
                  </div>
                  <button onClick={() => removeFromQueue(i)} className="text-gray-300 hover:text-red-500 text-lg ml-3">×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {msg && (
          <p className="text-sm font-medium mb-3 text-center" style={{ color: msg.includes('✓') ? '#2d6a2d' : '#9D2235' }}>{msg}</p>
        )}

        <button onClick={handlePrint} disabled={loading || queue.length === 0}
          className="w-full py-3 rounded-xl text-white font-bold text-base"
          style={{ backgroundColor: queue.length > 0 ? '#9D2235' : '#D5D5D4', border: 'none',
            cursor: queue.length > 0 ? 'pointer' : 'not-allowed', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Generating...' : `🖨️ Print ${queue.length > 0 ? queue.length : ''} Badge${queue.length !== 1 ? 's' : ''}`}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">Downloads a PDF — badges print in registration date order</p>
      </div>
    </div>
  );
}
