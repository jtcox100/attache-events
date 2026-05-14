import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/AppHeader';
import api from '../../services/api';

export default function AdminSurveyResults() {
  const { user } = useAuth();
  const eventId = user?.event_id;
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    if (!eventId) return;
    Promise.all([
      api.get(`/api/survey/results/${eventId}`),
      api.get(`/api/sessions/event/${eventId}`)
    ]).then(([r, s]) => {
      setResponses(r.data || []);
      const allSessions = s.data || [];
      setSessions(allSessions.filter(s => s.is_mandatory !== true));
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, [eventId]);

  async function handleClear() {
    if (!window.confirm('Clear ALL survey responses for this event? This cannot be undone.')) return;
    try {
      await api.delete(`/api/survey/clear/${eventId}`);
      setResponses([]);
    } catch (err) { console.error(err); }
  }

  async function handleExport() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/survey/results/${eventId}/export`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await res.blob();
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'survey-results.csv'; a.click();
  }

  const filtered = filter === 'all' ? responses : responses.filter(r => r.session_id === filter);
  const avg = (key) => {
    const vals = filtered.map(r => r[key]).filter(Boolean);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : '—';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Survey Results" backLink="/admin" backLabel="Dashboard" />
      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
          {[
            ['Responses', filtered.length, '#262D33'],
            ['Topic Useful', avg('q_topic_useful') + '/5', '#185676'],
            ['Presenter', avg('q_presenter_rating') + '/5', '#185676'],
            ['Satisfaction', avg('q_overall_satisfaction') + '/5', '#9D2235'],
          ].map(([label, val, color]) => (
            <div key={label} className="bg-white rounded-xl border p-4 text-center" style={{ borderColor: '#D5D5D4' }}>
              <p className="text-2xl font-bold" style={{ color }}>{val}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3 items-center" style={{ borderColor: '#D5D5D4' }}>
          <select value={filter} onChange={e => setFilter(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none" style={{ borderColor: '#D5D5D4', minWidth: 200 }}>
            <option value="all">All sessions</option>
            {sessions.map(s => <option key={s.session_id || s.id} value={s.session_id || s.id}>{s.title}</option>)}
          </select>
          <button onClick={handleExport} className="px-4 py-2 text-white text-sm rounded-lg" style={{ backgroundColor: '#262D33' }}>
            Export CSV
          </button>
          <button onClick={handleClear} className="px-4 py-2 text-white text-sm rounded-lg" style={{ backgroundColor: '#6b7280' }}>
            Clear All
          </button>
        </div>

        {/* Survey QR codes for each session */}
        <div className="bg-white rounded-xl border p-4 mb-4" style={{ borderColor: '#D5D5D4' }}>
          <p className="text-sm font-semibold text-gray-700 mb-3">Survey QR Codes — print and post in each room</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {sessions.map(s => {
              const sid = s.session_id || s.id;
              const url = `${window.location.origin}/survey?event=${eventId}&session=${sid}`;
              return (
                <div key={sid} className="border rounded-lg p-3 text-center" style={{ borderColor: '#D5D5D4' }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(url)}`}
                    alt="Survey QR" style={{ width: 120, height: 120, margin: '0 auto', display: 'block' }} />
                  <p className="text-xs font-medium mt-2 text-gray-700 leading-tight">{s.title}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Responses table */}
        <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#D5D5D4' }}>
          {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}
          {!loading && filtered.length === 0 && <p className="text-center text-gray-400 py-8">No responses yet</p>}
          {!loading && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#262D33' }}>
                    {['Session', 'Name', 'Email', 'Topic', 'Presenter', 'Adoption', 'Overall', 'Follow up?', 'Submitted'].map(h => (
                      <th key={h} className="text-left px-3 py-3 font-semibold text-white whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                      <td className="px-3 py-2 text-gray-600 text-xs">{r.sessions?.title?.substring(0, 30) || '—'}</td>
                      <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{r.name}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{r.email}</td>
                      {['q_topic_useful','q_presenter_rating','q_adoption_likelihood','q_overall_satisfaction'].map(k => (
                        <td key={k} className="px-3 py-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: r[k] >= 4 ? '#f0f7f0' : r[k] === 3 ? '#fef9ee' : '#fdf0f2', color: r[k] >= 4 ? '#2d6a2d' : r[k] === 3 ? '#856404' : '#9D2235' }}>
                            {r[k]}
                          </span>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center text-xs">{r.q_followup_yn ? <span style={{ color: '#2d6a2d' }}>Yes</span> : 'No'}</td>
                      <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">{new Date(r.submitted_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-right">{filtered.length} response{filtered.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}
