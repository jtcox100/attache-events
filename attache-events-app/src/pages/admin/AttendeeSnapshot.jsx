import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import AppHeader from '../../components/AppHeader';
import api from '../../services/api';

const BORDER = { borderColor: '#D5D5D4' };

const RATINGS = [
  ['q_topic_useful', 'Topic useful'],
  ['q_presenter_rating', 'Presenter'],
  ['q_adoption_likelihood', 'Adoption likelihood (12 mo)'],
  ['q_overall_satisfaction', 'Overall satisfaction'],
];

function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function SurveyBlock({ survey }) {
  if (!survey) {
    return <p style={{ fontSize: 12, color: '#9ca3af', margin: '8px 0 0' }}>No survey submitted</p>;
  }
  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f0f0f0' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#856404', textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 6px' }}>Survey</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ marginBottom: 6 }}>
        {RATINGS.filter(([k]) => survey[k]).map(([k, label]) => (
          <span key={k} style={{ fontSize: 12, color: '#374151' }}>
            {label}: <strong>{survey[k]}/5</strong>
          </span>
        ))}
      </div>
      {survey.q_followup_yn != null && (
        <p style={{ fontSize: 12, color: '#374151', margin: '2px 0' }}>
          Follow-up requested: <strong>{survey.q_followup_yn ? 'Yes' : 'No'}</strong>
          {survey.q_followup_yn && survey.q_followup_text ? ` — ${survey.q_followup_text}` : ''}
        </p>
      )}
      {survey.q_similar_material_yn != null && (
        <p style={{ fontSize: 12, color: '#374151', margin: '2px 0' }}>
          Wants similar material: <strong>{survey.q_similar_material_yn ? 'Yes' : 'No'}</strong>
          {survey.q_similar_material_yn && survey.q_similar_material_text ? ` — ${survey.q_similar_material_text}` : ''}
        </p>
      )}
      {survey.q_purchase_process && (
        <p style={{ fontSize: 12, color: '#374151', margin: '2px 0' }}>
          Purchase process: <span style={{ fontStyle: 'italic' }}>{survey.q_purchase_process}</span>
        </p>
      )}
    </div>
  );
}

export default function AttendeeSnapshot() {
  const { event_id } = useParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const skipNextSearch = useRef(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (skipNextSearch.current) { skipNextSearch.current = false; return; }
    if (!query.trim() || query.trim().length < 2 || !event_id) {
      setResults([]); setSearchError(''); return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchError('');
        const { data } = await api.get('/api/attendees/search', { params: { event_id, q: query.trim() } });
        setResults(data);
        if (data.length === 0) setSearchError('No attendees found');
      } catch { setSearchError('Search failed'); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, event_id]);

  async function selectAttendee(a) {
    skipNextSearch.current = true;
    setQuery(a.name);
    setResults([]);
    setLoading(true);
    setSnapshot(null);
    try {
      const { data } = await api.get(`/api/attendees/${a.id}/snapshot`);
      setSnapshot(data);
    } catch {
      setSnapshot({ error: 'Could not load this attendee' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Attendee Snapshot" backLink="/admin" backLabel="Dashboard" />

      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="bg-white rounded-xl border p-4 mb-4" style={BORDER}>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Find attendee</label>
          <div className="relative">
            <input ref={inputRef} type="text" value={query}
              onChange={e => { setQuery(e.target.value); }}
              placeholder="Type a name, email or company..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none"
              style={BORDER} />
            {results.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg overflow-hidden" style={BORDER}>
                {results.map(a => (
                  <button key={a.id} onClick={() => selectAttendee(a)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    style={{ background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0', cursor: 'pointer' }}>
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.email}{a.company ? ` · ${a.company}` : ''}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          {searchError && <p className="text-xs text-gray-400 mt-2">{searchError}</p>}
        </div>

        {loading && <p className="text-center text-gray-400 py-8">Loading…</p>}

        {snapshot?.error && <p className="text-center text-gray-400 py-8">{snapshot.error}</p>}

        {snapshot && !snapshot.error && (
          <>
            <div className="bg-white rounded-xl border p-4 mb-4" style={BORDER}>
              <h2 className="text-lg font-bold" style={{ color: '#262D33' }}>{snapshot.attendee.name}</h2>
              {(snapshot.attendee.title || snapshot.attendee.company) && (
                <p className="text-sm text-gray-500">
                  {[snapshot.attendee.title, snapshot.attendee.company].filter(Boolean).join(' · ')}
                </p>
              )}
              <p className="text-xs text-gray-400">{snapshot.attendee.email}</p>
              <div className="mt-3">
                {snapshot.checkin ? (
                  <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#f0f7f0', color: '#2d6a2d' }}>
                    Checked in at front desk · {fmtTime(snapshot.checkin.checked_in_at)}
                  </span>
                ) : (
                  <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: '#f5f5f5', color: '#9ca3af' }}>
                    No front-desk check-in recorded
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Sessions attended ({snapshot.sessions.length})
            </p>

            {snapshot.sessions.length === 0 ? (
              <div className="bg-white rounded-xl border p-6 text-center text-sm text-gray-400" style={BORDER}>
                No room scans recorded for this attendee.
              </div>
            ) : (
              <div className="space-y-3">
                {snapshot.sessions.map(s => (
                  <div key={s.session_id} className="bg-white rounded-xl border p-4" style={BORDER}>
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#262D33' }}>{s.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {fmtTime(s.start_time)}–{fmtTime(s.end_time)}{s.room_name ? ` · ${s.room_name}` : ''}
                        </p>
                      </div>
                      <span className="text-xs shrink-0 px-2 py-1 rounded" style={{ backgroundColor: '#f0f5fa', color: '#185676' }}>
                        Scanned {fmtTime(s.scanned_at)}
                      </span>
                    </div>
                    <SurveyBlock survey={s.survey} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
