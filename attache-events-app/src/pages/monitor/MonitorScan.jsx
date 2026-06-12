import { useState, useEffect, useRef } from 'react';
import AppHeader from '../../components/AppHeader';
import QRScanner from '../../components/QRScanner';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import ScheduleView from '../../components/ScheduleView';

export default function MonitorScan() {
  const { user } = useAuth();
  const eventId = user?.event_id;
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [scanInput, setScanInput] = useState('');
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState(null); // override decision awaiting monitor: { code, attendee_name, company }
  const [confirmRemove, setConfirmRemove] = useState(null); // row key awaiting remove confirmation
  const [recentScans, setRecentScans] = useState([]);
  const [showCamera, setShowCamera] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [roomAttendees, setRoomAttendees] = useState([]);
  const [winner, setWinner] = useState(null);
  const [drawing, setDrawing] = useState(false);
  const [surveyCount, setSurveyCount] = useState(0);
  const [tab, setTab] = useState('Scan');
  const [schedule, setSchedule] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (user?.event_id) {
      api.get(`/api/monitor/sessions/${user.event_id}`).then(r => setSessions(r.data)).catch(console.error);
      api.get(`/api/sessions/event/${user.event_id}`).then(r => setSchedule(r.data || [])).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (selectedSession) {
      inputRef.current?.focus();
      api.get(`/api/monitor/scan-count/${selectedSession}`)
        .then(r => { setScanCount(r.data.count || 0); setRoomAttendees(r.data.attendees || []); })
        .catch(() => { setScanCount(0); setRoomAttendees([]); });
      api.get(`/api/survey/count/${eventId}`, { params: { session_id: selectedSession } })
        .then(r => setSurveyCount(r.data.count || 0))
        .catch(() => setSurveyCount(0));
    }
  }, [selectedSession]);

  function admitLocally(data, override = false) {
    setRecentScans(prev => [{ ...data, override, time: new Date() }, ...prev.slice(0, 9)]);
    setScanCount(prev => prev + 1);
    setRoomAttendees(prev => [...prev, { id: data.attendance_id, name: data.attendee_name, company: data.company, scanned_at: new Date().toISOString() }]);
  }

  // Remove an attendee from the room and drop the headcount by one.
  async function handleRemove(a) {
    setConfirmRemove(null);
    try {
      if (a.id) await api.delete(`/api/monitor/attendance/${a.id}`);
      setRoomAttendees(prev => prev.filter(x => (a.id ? x.id !== a.id : x !== a)));
      setScanCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  }

  async function doScan(code) {
    setShowCamera(false);
    setPending(null);
    const trimmed = code.trim();
    try {
      const { data } = await api.get(`/api/monitor/scan/${trimmed}/session/${selectedSession}`);

      // Checked in at the front desk but not registered for this session:
      // hold for the monitor's Admit/Deny decision. Do not count or dismiss yet.
      if (data.scan_result === 'override_available') {
        setPending({ code: trimmed, attendee_name: data.attendee_name, company: data.company });
        setResult(data);
        return;
      }

      setResult(data);
      if (data.scan_result === 'admit') {
        admitLocally(data);
      } else if (data.scan_result !== 'already_scanned') {
        // blocked (no_door_checkin), invalid, etc. — log it, never count it
        setRecentScans(prev => [{ ...data, time: new Date() }, ...prev.slice(0, 9)]);
      }
      setTimeout(() => setResult(null), 5000);
    } catch {
      setResult({ scan_result: 'error', attendee_name: null });
      setTimeout(() => setResult(null), 5000);
    }
  }

  // Monitor tapped "Admit" on the override prompt. Server re-checks the front-desk rule.
  async function handleAdmitOverride() {
    if (!pending) return;
    const { code } = pending;
    setPending(null);
    try {
      const { data } = await api.post(`/api/monitor/admit/${code}/session/${selectedSession}`);
      setResult(data);
      if (data.scan_result === 'admit') admitLocally(data, true);
    } catch {
      setResult({ scan_result: 'error', attendee_name: null });
    } finally {
      setTimeout(() => setResult(null), 5000);
      inputRef.current?.focus();
    }
  }

  // Monitor tapped "Deny" — nothing recorded, just clear.
  function handleDenyOverride() {
    setPending(null);
    setResult(null);
    inputRef.current?.focus();
  }

  async function handleDraw() {
    if (!selectedSession) { setWinner({ error: 'Please select a session first' }); return; }
    setDrawing(true); setWinner(null);
    try {
      const { data } = await api.get(`/api/survey/draw/${eventId}`, { params: { session_id: selectedSession } });
      setWinner(data);
    } catch (err) {
      setWinner({ error: err.response?.data?.error || 'No responses yet' });
    } finally { setDrawing(false); }
  }

  async function handleManualScan(e) {
    e.preventDefault();
    if (!scanInput.trim() || !selectedSession) return;
    await doScan(scanInput.trim());
    setScanInput(''); inputRef.current?.focus();
  }

  function resultDisplay(r) {
    if (!r) return null;
    const configs = {
      admit: { bg: '#f0f7f0', border: '#2d6a2d', text: '#2d6a2d', label: 'Admit' },
      no_door_checkin: { bg: '#fdf0f2', border: '#9D2235', text: '#9D2235', label: 'Not checked in at front desk' },
      override_available: { bg: '#fdf8ee', border: '#856404', text: '#856404', label: 'Not registered for this session' },
      not_registered: { bg: '#fdf8ee', border: '#856404', text: '#856404', label: 'Not registered' },
      already_scanned: { bg: '#f0f5fa', border: '#185676', text: '#185676', label: 'Already scanned in' },
      invalid: { bg: '#f5f5f5', border: '#999', text: '#666', label: 'QR code not recognized' },
      error: { bg: '#f5f5f5', border: '#999', text: '#666', label: 'Scan error' },
    };
    const c = configs[r.scan_result] || configs.error;
    return (
      <div className="rounded-xl p-4 text-center border" style={{ backgroundColor: c.bg, borderColor: c.border }}>
        <p className="text-xl font-bold" style={{ color: c.text }}>{c.label}</p>
        {r.attendee_name && <p className="mt-1 text-sm" style={{ color: c.text }}>{r.attendee_name}</p>}
        {r.company && <p className="text-xs" style={{ color: c.text, opacity: 0.75 }}>{r.company}</p>}
        {r.scan_result === 'no_door_checkin' && <p className="text-xs mt-2" style={{ color: c.text }}>Send them to the front desk to check in first — cannot admit.</p>}
        {r.scan_result === 'already_scanned' && <p className="text-xs mt-2" style={{ color: c.text }}>This attendee is already in the room</p>}
        {r.scan_result === 'invalid' && <p className="text-xs mt-2" style={{ color: c.text }}>Try again, or send them to the front desk.</p>}
        {r.scan_result === 'override_available' && (
          <>
            <p className="text-xs mt-2" style={{ color: c.text }}>Checked in at the front desk but not registered for this session.</p>
            <div className="flex gap-2 mt-3">
              <button onClick={handleAdmitOverride}
                className="flex-1 py-2 text-white text-sm font-semibold rounded-lg"
                style={{ backgroundColor: '#2d6a2d', border: 'none', cursor: 'pointer' }}>
                Admit
              </button>
              <button onClick={handleDenyOverride}
                className="flex-1 py-2 text-white text-sm font-semibold rounded-lg"
                style={{ backgroundColor: '#9D2235', border: 'none', cursor: 'pointer' }}>
                Deny
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Room Monitor" />
      {showCamera && <QRScanner onScan={doScan} onClose={() => setShowCamera(false)} />}

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' }}>
        {['Scan', 'Schedule'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: '12px', fontSize: 14, fontWeight: 500, border: 'none',
              backgroundColor: 'transparent', cursor: 'pointer',
              color: tab === t ? '#9D2235' : '#666',
              borderBottom: tab === t ? '2px solid #9D2235' : '2px solid transparent' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Schedule tab */}
      {tab === 'Schedule' && <ScheduleView sessions={schedule} />}

      {/* Scan tab */}
      {tab === 'Scan' && (
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#D5D5D4' }}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select your session</label>
            <select value={selectedSession} onChange={e => { setSelectedSession(e.target.value); setResult(null); setRecentScans([]); }}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" style={{ borderColor: '#D5D5D4' }}>
              <option value="">Choose a session...</option>
              {sessions.map(s => (
                <option key={s.session_id} value={s.session_id}>
                  {s.title} — {s.room_name} · {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </option>
              ))}
            </select>
          </div>

          {selectedSession && (() => {
            const session = sessions.find(s => s.session_id === selectedSession);
            const capacity = session?.capacity || 0;
            const pct = capacity > 0 ? Math.min(100, Math.round((scanCount / capacity) * 100)) : 0;
            const isNearFull = pct >= 80;
            return (
              <>
                <div className="bg-white rounded-xl border p-4" style={{ borderColor: isNearFull ? '#9D2235' : '#D5D5D4' }}>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-gray-700">Room headcount</p>
                    <p className="text-2xl font-bold" style={{ color: isNearFull ? '#9D2235' : '#262D33' }}>
                      {scanCount} <span className="text-base font-normal text-gray-400">/ {capacity}</span>
                    </p>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ backgroundColor: '#f0f0f0' }}>
                    <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: isNearFull ? '#9D2235' : '#185676' }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{pct}% capacity{isNearFull ? ' — room filling up' : ''}</p>
                </div>

                <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#D5D5D4' }}>
                  <p className="text-sm font-medium text-gray-700 mb-3">Scan attendee QR code</p>
                  <button onClick={() => setShowCamera(true)} className="w-full py-3 text-white text-sm font-medium rounded-lg mb-3" style={{ backgroundColor: '#9D2235' }}>
                    Open camera to scan
                  </button>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400">or type manually</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <form onSubmit={handleManualScan} className="flex gap-2">
                    <input ref={inputRef} type="text" value={scanInput} onChange={e => setScanInput(e.target.value)}
                      placeholder="Type QR code..."
                      className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none"
                      style={{ borderColor: '#D5D5D4' }} autoComplete="off" />
                    <button type="submit" className="px-4 py-2 text-white text-sm rounded-lg" style={{ backgroundColor: '#262D33' }}>Check</button>
                  </form>
                </div>

                {result && resultDisplay(result)}

                {roomAttendees.length > 0 && (
                  <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#D5D5D4' }}>
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      In the room
                      <span className="ml-2 text-xs font-normal text-gray-400">{roomAttendees.length} attendee{roomAttendees.length !== 1 ? 's' : ''}</span>
                    </p>
                    <div className="space-y-2">
                      {roomAttendees.map((a, i) => {
                        const rowKey = a.id ?? i;
                        return (
                        <div key={rowKey} className="flex items-center justify-between text-sm"
                          style={{ borderBottom: i < roomAttendees.length - 1 ? '1px solid #f5f5f5' : 'none', paddingBottom: 6 }}>
                          <div>
                            <p className="font-medium text-gray-900">{a.name || 'Unknown'}</p>
                            {a.company && <p className="text-xs text-gray-400">{a.company}</p>}
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span className="text-gray-400 text-xs">
                              {new Date(a.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {confirmRemove === rowKey ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Remove?</span>
                                <button onClick={() => handleRemove(a)}
                                  className="text-xs font-semibold px-2 py-1 rounded text-white"
                                  style={{ backgroundColor: '#9D2235', border: 'none', cursor: 'pointer' }}>
                                  Confirm
                                </button>
                                <button onClick={() => setConfirmRemove(null)}
                                  className="text-xs font-medium px-2 py-1 rounded"
                                  style={{ color: '#666', border: '1px solid #d5d5d4', backgroundColor: '#fff', cursor: 'pointer' }}>
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmRemove(rowKey)}
                                className="text-xs font-medium px-2 py-1 rounded"
                                style={{ color: '#9D2235', border: '1px solid #e7c3c9', backgroundColor: '#fff', cursor: 'pointer' }}>
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#D5D5D4' }}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold text-gray-700">🎁 Prize Draw</p>
              <span className="text-sm font-bold" style={{ color: '#9D2235' }}>{surveyCount} survey{surveyCount !== 1 ? 's' : ''} submitted</span>
            </div>
            <button onClick={handleDraw} disabled={drawing}
              className="w-full py-3 rounded-lg text-white font-bold text-sm"
              style={{ backgroundColor: '#9D2235', opacity: drawing ? 0.6 : 1, border: 'none', cursor: 'pointer' }}>
              {drawing ? 'Drawing...' : 'Draw a Winner'}
            </button>
            {winner && !winner.error && (
              <div className="mt-3 p-3 rounded-lg text-center" style={{ backgroundColor: '#f0f7f0', border: '1px solid #2d6a2d' }}>
                <p className="text-xs text-gray-500 mb-1">🎉 Winner!</p>
                <p className="text-lg font-bold" style={{ color: '#2d6a2d' }}>{winner.winner_name}</p>
                <p className="text-sm text-gray-500">{winner.winner_email}</p>
                <p className="text-xs text-gray-400 mt-1">Drawn from {winner.total_entries} entr{winner.total_entries !== 1 ? 'ies' : 'y'}</p>
              </div>
            )}
            {winner?.error && <p className="text-sm mt-2 text-center" style={{ color: '#9D2235' }}>{winner.error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
