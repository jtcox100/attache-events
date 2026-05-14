import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppHeader from '../../components/AppHeader';
import api from '../../services/api';

export default function AdminLiveAttendance() {
  const { event_id } = useParams();
  const [sessions, setSessions] = useState([]);
  const [eventName, setEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [expanded, setExpanded] = useState(null);

  async function load() {
    try {
      const [attRes, eventRes] = await Promise.all([
        api.get(`/api/reports/live-attendance/${event_id}`),
        api.get(`/api/events/${event_id}`)
      ]);
      setSessions(attRes.data || []);
      setEventName(eventRes.data?.name || '');
      setLastRefresh(new Date());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [event_id]);

  const liveSessions = sessions.filter(s => s.is_live);
  const otherSessions = sessions.filter(s => !s.is_live);

  function SessionCard({ s }) {
    const isExpanded = expanded === s.session_id;
    const pct = s.registered_count > 0 ? Math.round((s.scanned_count / s.registered_count) * 100) : 0;

    return (
      <div className="bg-white rounded-xl border overflow-hidden mb-3" style={{ borderColor: s.is_live ? '#185676' : '#D5D5D4', boxShadow: s.is_live ? '0 0 0 2px #185676' : 'none' }}>
        <button onClick={() => setExpanded(isExpanded ? null : s.session_id)}
          className="w-full p-4 text-left" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {s.is_live && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#185676', color: '#fff' }}>
                    ● LIVE
                  </span>
                )}
                <p className="text-sm font-semibold truncate" style={{ color: '#262D33' }}>{s.title}</p>
              </div>
              <p className="text-xs text-gray-500">
                {s.room_name} · {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold" style={{ color: '#262D33' }}>{s.scanned_count}</p>
              <p className="text-xs text-gray-400">of {s.registered_count} reg.</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3 w-full rounded-full h-2" style={{ backgroundColor: '#f0f0f0' }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: s.is_live ? '#185676' : '#9D2235' }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-400">{pct}% attendance</span>
            <span className="text-xs text-gray-400">{isExpanded ? '▲ Hide' : '▼ Show attendees'}</span>
          </div>
        </button>

        {/* Expanded attendee list */}
        {isExpanded && (
          <div className="border-t px-4 py-3" style={{ borderColor: '#f0f0f0', backgroundColor: '#fafafa' }}>
            {s.scans.length === 0 ? (
              <p className="text-sm text-gray-400">No one scanned in yet</p>
            ) : (
              <div className="space-y-1">
                {s.scans.map((scan, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium" style={{ color: '#262D33' }}>{scan.name}</span>
                      {scan.company && <span className="text-gray-400 ml-2 text-xs">{scan.company}</span>}
                    </div>
                    <span className="text-gray-400 text-xs">{new Date(scan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Live Attendance" backLink="/admin" backLabel="Dashboard" />

      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#262D33' }}>{eventName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {lastRefresh && `Last updated ${lastRefresh.toLocaleTimeString()}`}
            </p>
          </div>
          <button onClick={load} className="px-4 py-2 text-white text-sm rounded-lg" style={{ backgroundColor: '#262D33' }}>
            Refresh now
          </button>
        </div>

        {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}

        {!loading && liveSessions.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#185676' }}>
              Currently in progress ({liveSessions.length})
            </h2>
            {liveSessions.map(s => <SessionCard key={s.session_id} s={s} />)}
          </div>
        )}

        {!loading && otherSessions.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-3 text-gray-500">
              All sessions ({otherSessions.length})
            </h2>
            {otherSessions.map(s => <SessionCard key={s.session_id} s={s} />)}
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <p className="text-center text-gray-400 py-8">No sessions found for this event</p>
        )}
      </div>
    </div>
  );
}
