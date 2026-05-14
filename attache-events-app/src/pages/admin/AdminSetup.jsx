import { useState, useEffect, useRef } from 'react';
import AppHeader from '../../components/AppHeader';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const TABS = ['Rooms', 'Sessions', 'Bulk Import', 'Badge Logo', 'WiFi & Info', 'Floor Plan'];
const BTN = "px-4 py-2 text-white text-sm rounded-lg transition-colors";
const BRAND = { backgroundColor: '#9D2235' };
const DARK = { backgroundColor: '#262D33' };
const INPUT = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none";
const BORDER = { borderColor: '#D5D5D4' };

function toLocalInput(utcString) {
  if (!utcString) return '';
  const d = new Date(utcString);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtTime(utcString) {
  if (!utcString) return '';
  return new Date(utcString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AdminSetup() {
  const { user } = useAuth();
  const [tab, setTab] = useState('Rooms');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [rooms, setRooms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const emptyRoom = { name: '', capacity: '', track: '' };
  const emptySession = { room_id: '', title: '', description_brief: '', description_full: '', speaker_id: '', start_time: '', end_time: '', is_mandatory: false };
  const [roomForm, setRoomForm] = useState(emptyRoom);
  const [editingRoom, setEditingRoom] = useState(null);
  const [sessionForm, setSessionForm] = useState(emptySession);
  const [editingSession, setEditingSession] = useState(null);
  const [bulkText, setBulkText] = useState('');
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkError, setBulkError] = useState('');
  const bulkFileRef = useRef(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoMsg, setLogoMsg] = useState('');
  const [currentLogo, setCurrentLogo] = useState('');
  const [wifiForm, setWifiForm] = useState({ wifi_network: '', wifi_password: '' });
  const [floorPlanUrl, setFloorPlanUrl] = useState('');
  const [floorPlanUploading, setFloorPlanUploading] = useState(false);
  const [floorPlanMsg, setFloorPlanMsg] = useState('');
  const [wifiMsg, setWifiMsg] = useState('');

  useEffect(() => {
    api.get('/api/events').then(r => {
      setEvents(r.data);
      if (user?.event_id) setSelectedEvent(user.event_id);
    }).catch(console.error);
  }, [user]);
  useEffect(() => { if (selectedEvent) { loadRooms(); loadSessions(); loadSpeakers(); loadEventInfo(); } }, [selectedEvent]);

  async function loadRooms() { try { const { data } = await api.get(`/api/rooms/event/${selectedEvent}`); setRooms(data || []); } catch (err) { console.error(err); } }
  async function loadSessions() { try { const { data } = await api.get(`/api/sessions/event/${selectedEvent}`); setSessions(data || []); } catch (err) { console.error(err); } }
  async function loadSpeakers() { try { const { data } = await api.get(`/api/speakers/event/${selectedEvent}`); setSpeakers(data || []); } catch (err) { console.error(err); } }
  async function loadEventInfo() {
    try {
      const { data } = await api.get(`/api/events/${selectedEvent}`);
      if (data?.badge_logo_url) setCurrentLogo(data.badge_logo_url);
      if (data?.floor_plan_url) setFloorPlanUrl(data.floor_plan_url);
      if (data?.wifi_network) setWifiForm({ wifi_network: data.wifi_network || '', wifi_password: data.wifi_password || '' });
    } catch (err) { console.error(err); }
  }

  function showMsg(t) { setMsg(t); setTimeout(() => setMsg(''), 3000); }
  function showError(t) { setError(t); setTimeout(() => setError(''), 5000); }

  async function handleRoomSubmit(e) {
    e.preventDefault();
    try {
      if (editingRoom) { await api.put(`/api/rooms/${editingRoom.id}`, { ...roomForm, capacity: Number(roomForm.capacity) }); showMsg('Room updated'); }
      else { await api.post('/api/rooms', { ...roomForm, capacity: Number(roomForm.capacity), event_id: selectedEvent }); showMsg('Room added'); }
      setRoomForm(emptyRoom); setEditingRoom(null); loadRooms();
    } catch (err) { showError(err.response?.data?.error || 'Failed'); }
  }

  async function handleDeleteRoom(id) {
    if (!window.confirm('Delete this room?')) return;
    try { await api.delete(`/api/rooms/${id}`); showMsg('Room deleted'); loadRooms(); loadSessions(); }
    catch (err) { showError(err.response?.data?.error || 'Failed'); }
  }

  function startEditRoom(r) { setEditingRoom(r); setRoomForm({ name: r.name, capacity: String(r.capacity), track: r.track || '' }); }

  async function handleSessionSubmit(e) {
    e.preventDefault();
    if (!sessionForm.room_id) { showError('Please select a room'); return; }
    if (!sessionForm.start_time || !sessionForm.end_time) { showError('Times required'); return; }
    const payload = { room_id: sessionForm.room_id, title: sessionForm.title, description_brief: sessionForm.description_brief || null, description_full: sessionForm.description_full || null, speaker_id: sessionForm.speaker_id || null, start_time: sessionForm.start_time + ':00-04:00', end_time: sessionForm.end_time + ':00-04:00', is_mandatory: sessionForm.is_mandatory };
    try {
      if (editingSession) { await api.put(`/api/sessions/${editingSession.id}`, payload); showMsg('Session updated'); }
      else { await api.post('/api/sessions', { ...payload, event_id: selectedEvent }); showMsg('Session added'); }
      setSessionForm(emptySession); setEditingSession(null); loadSessions();
    } catch (err) { showError(err.response?.data?.error || 'Failed'); }
  }

  async function handleDeleteSession(id) {
    if (!window.confirm('Delete this session?')) return;
    try { await api.delete(`/api/sessions/${id}`); showMsg('Session deleted'); loadSessions(); }
    catch (err) { showError(err.response?.data?.error || 'Failed'); }
  }

  function startEditSession(s) {
    const id = s.session_id || s.id;
    setEditingSession({ ...s, id });
    setSessionForm({ room_id: s.room_id || '', title: s.title || '', description_brief: s.description_brief || '', description_full: s.description_full || '', speaker_id: s.speaker_id || '', start_time: toLocalInput(s.start_time), end_time: toLocalInput(s.end_time), is_mandatory: s.is_mandatory || false });
    setTab('Sessions'); window.scrollTo(0, 0);
  }

  async function handleLogoUpload(e) {
    e.preventDefault();
    if (!logoFile) { setLogoMsg('Select a file first'); return; }
    const formData = new FormData(); formData.append('logo', logoFile);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/badges/logo/${selectedEvent}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLogoMsg('Logo uploaded'); setCurrentLogo(data.url); setLogoFile(null); setLogoPreview('');
      setTimeout(() => setLogoMsg(''), 3000);
    } catch (err) { setLogoMsg(err.message || 'Upload failed'); setTimeout(() => setLogoMsg(''), 4000); }
  }

  async function handleWifiSave(e) {
    e.preventDefault();
    try { await api.put(`/api/events/${selectedEvent}`, wifiForm); setWifiMsg('WiFi info saved'); setTimeout(() => setWifiMsg(''), 3000); }
    catch { setWifiMsg('Save failed'); setTimeout(() => setWifiMsg(''), 3000); }
  }

  function parseCSVLine(line) {
    const result = []; let cur = ''; let inQ = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ; }
      else if (line[i] === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
      else { cur += line[i]; }
    }
    result.push(cur.trim());
    return result;
  }

  function parseBulk(text) {
    const src = text !== undefined ? text : bulkText;
    setBulkError(''); setBulkPreview([]);
    const eventDate = events.find(e => e.id === selectedEvent)?.event_date;
    if (!eventDate) { setBulkError('Select an event first'); return; }
    const lines = src.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'));
    if (!lines.length) { setBulkError('No data found'); return; }

    // Detect CSV (has header row with commas) vs pipe format
    const isCSV = lines[0].includes(',') && lines[0].toLowerCase().includes('title');
    const parsed = []; const errors = [];

    const dataLines = isCSV ? lines.slice(1) : lines; // skip header row for CSV

    dataLines.forEach((line, i) => {
      const lineNum = i + (isCSV ? 2 : 1);
      let title, roomName, track, startRaw, endRaw, desc, speakerName, isMandatory;

      if (isCSV) {
        const parts = parseCSVLine(line);
        // Expected: title, room, track, start_time, end_time, description_brief, speaker_name, is_mandatory
        [title, roomName, track, startRaw, endRaw, desc, speakerName, isMandatory] = parts;
      } else {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 4) { errors.push(`Line ${lineNum}: needs START|END|ROOM|TITLE`); return; }
        const [start, end, rn, t, sp, ...descParts] = parts;
        [startRaw, endRaw, roomName, title, speakerName, desc] = [start, end, rn, t, sp, descParts.join('|')];
      }

      const room = rooms.find(r => r.name.toLowerCase() === (roomName||'').toLowerCase());
      if (!room) { errors.push(`Row ${lineNum}: room "${roomName}" not found`); return; }

      // Parse start/end — handle both full ISO and HH:MM formats
      let start_time, end_time;
      try {
        // Append EDT offset (-04:00) so times are stored unambiguously
        const toET = (raw, date) => {
          const base = raw.includes('T') ? raw.replace(/Z$/, '').replace(/[+-]\d\d:\d\d$/, '') : `${date}T${raw}`;
          const withSecs = base.length === 16 ? base + ':00' : base;
          return withSecs + '-04:00';
        };
        start_time = toET(startRaw, eventDate);
        end_time = toET(endRaw, eventDate);
      } catch { errors.push(`Row ${lineNum}: invalid time format`); return; }

      parsed.push({
        room_id: room.id, room_name: room.name, title: title||'',
        speaker_name: speakerName || '', description_brief: (desc||'').slice(0, 300),
        start_time, end_time, is_mandatory: isMandatory === 'true',
        _ds: start_time.slice(11,16), _de: end_time.slice(11,16)
      });
    });
    if (errors.length) { setBulkError(errors.join('\n')); return; }
    setBulkPreview(parsed);
  }

  function handleBulkFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      setBulkText(text);
      setBulkPreview([]);
      setBulkError('');
      parseBulk(text);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleDeleteAllSessions() {
    if (!window.confirm(`Delete ALL ${sessions.length} sessions for this event? This cannot be undone.`)) return;
    try {
      await Promise.all(sessions.map(s => api.delete(`/api/sessions/${s.session_id || s.id}`)));
      showMsg('All sessions deleted'); loadSessions();
    } catch (err) { showError('Failed to delete sessions'); }
  }

  async function handleBulkImport() {
    if (!bulkPreview.length) return;
    try {
      const { data } = await api.post('/api/sessions/bulk', { event_id: selectedEvent, sessions: bulkPreview.map(({ _ds, _de, room_name, ...s }) => s) });
      showMsg(`${data.sessions.length} sessions imported`); setBulkText(''); setBulkPreview([]); loadSessions(); setTab('Sessions');
    } catch (err) { showError(err.response?.data?.error || 'Import failed'); }
  }

  const sessionsByTrack = sessions.reduce((acc, s) => {
    const track = s.track || rooms.find(r => r.id === s.room_id)?.track || 'Unassigned';
    if (!acc[track]) acc[track] = []; acc[track].push(s); return acc;
  }, {});
  const tracks = [...new Set(rooms.map(r => r.track).filter(Boolean))];

  async function handleFloorPlanUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !selectedEvent) return;
    setFloorPlanUploading(true); setFloorPlanMsg('');
    try {
      const formData = new FormData();
      formData.append('floor_plan', file);
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/events/${selectedEvent}/floor-plan`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFloorPlanUrl(data.floor_plan_url);
      setFloorPlanMsg('Floor plan uploaded successfully');
      setTimeout(() => setFloorPlanMsg(''), 3000);
    } catch (err) { setFloorPlanMsg(err.message || 'Upload failed'); }
    finally { setFloorPlanUploading(false); e.target.value = ''; }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Event Setup" backLink="/admin" backLabel="Dashboard" />
      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Event name display */}
        {selectedEvent && events.find(e => e.id === selectedEvent) && (
          <div className="mb-6">
            <p className="text-sm text-gray-500">Managing: <strong style={{ color: '#262D33' }}>{events.find(e => e.id === selectedEvent)?.name}</strong></p>
          </div>
        )}
        {msg && <div className="mb-4 px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: '#f0f7f0', border: '1px solid #c3e6c3', color: '#2d6a2d' }}>{msg}</div>}
        {error && <div className="mb-4 px-4 py-2 rounded-lg text-sm whitespace-pre-line" style={{ backgroundColor: '#fdf0f2', border: '1px solid #f5c6cc', color: '#9D2235' }}>{error}</div>}

        {selectedEvent && (
          <>
            <div className="flex border-b mb-6" style={{ borderColor: '#D5D5D4' }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} className="px-4 py-3 text-sm font-medium transition-colors"
                  style={tab === t ? { color: '#9D2235', borderBottom: '2px solid #9D2235' } : { color: '#666' }}>{t}</button>
              ))}
            </div>

            {tab === 'Rooms' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6" style={BORDER}>
                  <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>{editingRoom ? 'Edit room' : 'Add room'}</h2>
                  <form onSubmit={handleRoomSubmit} className="space-y-3">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Room name</label>
                      <input type="text" value={roomForm.name} onChange={e => setRoomForm(p => ({ ...p, name: e.target.value }))} required className={INPUT} style={BORDER} placeholder="e.g. Regency A" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                      <input type="number" value={roomForm.capacity} onChange={e => setRoomForm(p => ({ ...p, capacity: e.target.value }))} required min="1" className={INPUT} style={BORDER} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Track</label>
                      <input type="text" value={roomForm.track} onChange={e => setRoomForm(p => ({ ...p, track: e.target.value }))} className={INPUT} style={BORDER} placeholder="e.g. Business, Technology" />
                      {tracks.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{tracks.map(t => <button key={t} type="button" onClick={() => setRoomForm(p => ({ ...p, track: t }))} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f5f5f5', color: '#262D33' }}>{t}</button>)}</div>}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" className={BTN} style={BRAND}>{editingRoom ? 'Save' : 'Add room'}</button>
                      {editingRoom && <button type="button" onClick={() => { setEditingRoom(null); setRoomForm(emptyRoom); }} className="px-4 py-2 border text-sm rounded-lg text-gray-600" style={BORDER}>Cancel</button>}
                    </div>
                  </form>
                </div>
                <div className="bg-white rounded-xl border p-6" style={BORDER}>
                  <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>Rooms ({rooms.length})</h2>
                  {rooms.length === 0 && <p className="text-sm text-gray-400">No rooms added yet</p>}
                  <div className="space-y-2">
                    {rooms.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg" style={{ borderColor: '#f0f0f0' }}>
                        <div><p className="text-sm font-medium" style={{ color: '#262D33' }}>{r.name}</p><p className="text-xs text-gray-500">Cap: {r.capacity}{r.track ? ` · ${r.track}` : ''}</p></div>
                        <div className="flex gap-2">
                          <button onClick={() => startEditRoom(r)} className="text-xs px-3 py-1 border rounded-lg text-gray-600" style={BORDER}>Edit</button>
                          <button onClick={() => handleDeleteRoom(r.id)} className="text-xs px-3 py-1 border rounded-lg" style={{ borderColor: '#9D2235', color: '#9D2235' }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'Sessions' && (
              <div>
                {sessions.length > 0 && (
                  <div className="flex justify-end mb-4">
                    <button onClick={handleDeleteAllSessions}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{ border: '1px solid #9D2235', color: '#9D2235', backgroundColor: 'transparent', cursor: 'pointer' }}>
                      Delete All Sessions ({sessions.length})
                    </button>
                  </div>
                )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6" style={BORDER}>
                  <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>{editingSession ? 'Edit session' : 'Add session'}</h2>
                  <form onSubmit={handleSessionSubmit} className="space-y-3">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                      <select value={sessionForm.room_id} onChange={e => setSessionForm(p => ({ ...p, room_id: e.target.value }))} required className={INPUT} style={BORDER}>
                        <option value="">Select a room...</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.track ? ` (${r.track})` : ''}</option>)}
                      </select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input type="text" value={sessionForm.title} onChange={e => setSessionForm(p => ({ ...p, title: e.target.value }))} required className={INPUT} style={BORDER} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Speaker</label>
                      <select value={sessionForm.speaker_id || ''} onChange={e => setSessionForm(p => ({ ...p, speaker_id: e.target.value }))} className={INPUT} style={BORDER}>
                        <option value="">No speaker / TBD</option>
                        {speakers.map(sp => <option key={sp.id} value={sp.id}>{sp.name}{sp.company ? ` — ${sp.company}` : ''}</option>)}
                      </select>
                      {speakers.length === 0 && <p className="text-xs text-gray-400 mt-1">No speakers added yet — go to the Speakers page first</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
                        <input type="datetime-local" value={sessionForm.start_time} onChange={e => setSessionForm(p => ({ ...p, start_time: e.target.value }))} required className={INPUT} style={BORDER} /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
                        <input type="datetime-local" value={sessionForm.end_time} onChange={e => setSessionForm(p => ({ ...p, end_time: e.target.value }))} required className={INPUT} style={BORDER} /></div>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Brief description</label>
                      <input type="text" value={sessionForm.description_brief} onChange={e => setSessionForm(p => ({ ...p, description_brief: e.target.value }))} className={INPUT} style={BORDER} /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Full description</label>
                      <textarea value={sessionForm.description_full} onChange={e => setSessionForm(p => ({ ...p, description_full: e.target.value }))} rows={3} className={INPUT} style={BORDER} /></div>

                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="mandatory" checked={sessionForm.is_mandatory} onChange={e => setSessionForm(p => ({ ...p, is_mandatory: e.target.checked }))} />
                      <label htmlFor="mandatory" className="text-sm font-medium text-gray-700">Mandatory session (all attendees)</label>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button type="submit" className={BTN} style={BRAND}>{editingSession ? 'Save' : 'Add session'}</button>
                      {editingSession && <button type="button" onClick={() => { setEditingSession(null); setSessionForm(emptySession); }} className="px-4 py-2 border text-sm rounded-lg text-gray-600" style={BORDER}>Cancel</button>}
                    </div>
                  </form>
                </div>
                <div className="bg-white rounded-xl border p-6 overflow-y-auto max-h-[800px]" style={BORDER}>
                  <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>Sessions ({sessions.length})</h2>
                  {sessions.length === 0 && <p className="text-sm text-gray-400">No sessions yet</p>}
                  {Object.entries(sessionsByTrack).map(([track, ts]) => (
                    <div key={track} className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#9D2235' }}>{track}</p>
                      <div className="space-y-2">
                        {[...ts].sort((a,b) => new Date(a.start_time)-new Date(b.start_time)).map(s => {
                          const sid = s.session_id || s.id;
                          return (
                            <div key={sid} className="p-3 border rounded-lg" style={{ borderColor: '#f0f0f0' }}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: '#262D33' }}>{s.title}{s.is_mandatory ? ' ★' : ''}</p>
                                  <p className="text-xs text-gray-500">{s.room_name} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)}</p>
                                </div>
                                <div className="flex gap-1 ml-2 shrink-0">
                                  <button onClick={() => startEditSession(s)} className="text-xs px-2 py-1 border rounded" style={BORDER}>Edit</button>
                                  <button onClick={() => handleDeleteSession(sid)} className="text-xs px-2 py-1 border rounded" style={{ borderColor: '#9D2235', color: '#9D2235' }}>Del</button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            )}

            {tab === 'Bulk Import' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6" style={BORDER}>
                  <h2 className="text-base font-semibold mb-2" style={{ color: '#262D33' }}>Bulk session import</h2>
                  <p className="text-sm text-gray-500 mb-4">Add rooms first. Upload a CSV file or paste pipe-delimited data below.</p>

                  {/* CSV file upload */}
                  <div className="mb-4 p-4 rounded-lg border-2 border-dashed text-center" style={{ borderColor: '#D5D5D4' }}>
                    <p className="text-sm text-gray-500 mb-2">Upload a CSV file (title, room, track, start_time, end_time, description_brief, speaker_name, is_mandatory)</p>
                    <button type="button" onClick={() => bulkFileRef.current?.click()}
                      className="px-4 py-2 text-white text-sm rounded-lg font-semibold"
                      style={{ backgroundColor: '#185676', border: 'none', cursor: 'pointer' }}>
                      📂 Choose CSV File
                    </button>
                    <input ref={bulkFileRef} type="file" accept=".csv" onChange={handleBulkFileUpload} style={{ display: 'none' }} />
                  </div>

                  <p className="text-xs text-gray-400 mb-2 text-center">— or paste pipe-delimited data —</p>
                  <textarea value={bulkText} onChange={e => { setBulkText(e.target.value); setBulkPreview([]); setBulkError(''); }}
                    rows={6} className={`${INPUT} font-mono mb-3`} style={BORDER} placeholder="08:30|09:10|Regency A|Session Title|Speaker|Description" />
                  {bulkError && <p className="text-xs mb-3 whitespace-pre-line" style={{ color: '#9D2235' }}>{bulkError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => parseBulk()} className={BTN} style={DARK}>Preview</button>
                    {bulkPreview.length > 0 && <button onClick={handleBulkImport} className={BTN} style={BRAND}>Import {bulkPreview.length}</button>}
                  </div>
                </div>
                <div className="bg-white rounded-xl border p-6" style={BORDER}>
                  <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>{bulkPreview.length > 0 ? `Preview — ${bulkPreview.length}` : 'Preview'}</h2>
                  {bulkPreview.length === 0 && <p className="text-sm text-gray-400">Click Preview to check before importing</p>}
                  <div className="space-y-2">
                    {bulkPreview.map((s, i) => (
                      <div key={i} className="p-3 border rounded-lg" style={{ borderColor: '#c3e6c3', backgroundColor: '#f0f7f0' }}>
                        <p className="text-sm font-medium" style={{ color: '#262D33' }}>{s.title}</p>
                        <p className="text-xs text-gray-500">{s.room_name} · {s._ds}–{s._de}{s.is_mandatory ? ' · Mandatory' : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === 'Badge Logo' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6" style={BORDER}>
                  <h2 className="text-base font-semibold mb-2" style={{ color: '#262D33' }}>Badge logo</h2>
                  <p className="text-sm text-gray-500 mb-4">Upload the logo for badges for this event. Use PNG with white background.</p>
                  <form onSubmit={handleLogoUpload} className="space-y-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Select logo file</label>
                      <input type="file" accept="image/png,image/jpeg" onChange={e => { const f = e.target.files[0]; if (f) { setLogoFile(f); setLogoPreview(URL.createObjectURL(f)); }}} className="w-full text-sm text-gray-600" /></div>
                    {logoPreview && <div className="border rounded-lg p-3" style={BORDER}><p className="text-xs text-gray-500 mb-2">Preview:</p><img src={logoPreview} alt="Preview" className="max-h-16 w-auto" /></div>}
                    {logoMsg && <p className="text-sm" style={{ color: logoMsg.includes('uploaded') ? '#2d6a2d' : '#9D2235' }}>{logoMsg}</p>}
                    <button type="submit" className={BTN} style={BRAND}>Upload logo</button>
                  </form>
                </div>
                <div className="bg-white rounded-xl border p-6" style={BORDER}>
                  <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>Current logo</h2>
                  {currentLogo ? (
                    <div><img src={currentLogo} alt="Current badge logo" className="max-h-20 w-auto mb-3" /><p className="text-xs text-gray-400">Used on all badges for this event.</p></div>
                  ) : <p className="text-sm text-gray-400">No logo uploaded — default will be used.</p>}
                </div>
              </div>
            )}

            {tab === 'Floor Plan' && (
          <div>
            <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>Floor Plan</h2>
            <p className="text-sm text-gray-500 mb-4">Upload a floor plan image for attendees to view in the app. Supports JPG, PNG, or PDF.</p>
            <div className="border-2 border-dashed rounded-xl p-6 text-center mb-4" style={{ borderColor: '#D5D5D4' }}>
              <input type="file" accept="image/*,.pdf" onChange={handleFloorPlanUpload} disabled={floorPlanUploading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:text-white cursor-pointer"
                style={{ '--file-bg': '#9D2235' }} />
              <p className="text-xs text-gray-400 mt-2">{floorPlanUploading ? 'Uploading...' : 'Click to select a floor plan image'}</p>
            </div>
            {floorPlanMsg && <p className="text-sm mb-4" style={{ color: floorPlanMsg.includes('success') ? '#2d6a2d' : '#9D2235' }}>{floorPlanMsg}</p>}
            {floorPlanUrl && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Current floor plan:</p>
                <img src={floorPlanUrl} alt="Floor plan preview"
                  style={{ width: '100%', borderRadius: 8, border: '1px solid #D5D5D4' }} />
              </div>
            )}
          </div>
        )}

        {tab === 'WiFi & Info' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border p-6" style={BORDER}>
                  <h2 className="text-base font-semibold mb-2" style={{ color: '#262D33' }}>WiFi Information</h2>
                  <p className="text-sm text-gray-500 mb-4">Attendees will see this with a scannable QR code to connect.</p>
                  <form onSubmit={handleWifiSave} className="space-y-3">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Network name (SSID)</label>
                      <input type="text" value={wifiForm.wifi_network} onChange={e => setWifiForm(p => ({ ...p, wifi_network: e.target.value }))} className={INPUT} style={BORDER} placeholder="e.g. LondonShowcase2026" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input type="text" value={wifiForm.wifi_password} onChange={e => setWifiForm(p => ({ ...p, wifi_password: e.target.value }))} className={INPUT} style={BORDER} /></div>
                    {wifiMsg && <p className="text-sm" style={{ color: wifiMsg.includes('saved') ? '#2d6a2d' : '#9D2235' }}>{wifiMsg}</p>}
                    <button type="submit" className={BTN} style={BRAND}>Save WiFi info</button>
                  </form>
                </div>
                <div className="bg-white rounded-xl border p-6" style={BORDER}>
                  <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>Preview</h2>
                  {wifiForm.wifi_network ? (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-3">QR code attendees will scan</p>
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent('WIFI:T:WPA;S:' + wifiForm.wifi_network + ';P:' + wifiForm.wifi_password + ';H:false;;')}`} alt="WiFi QR" className="mx-auto rounded-lg" style={{ width: 160, height: 160 }} />
                      <p className="text-sm font-medium mt-3">{wifiForm.wifi_network}</p>
                      {wifiForm.wifi_password && <p className="text-xs text-gray-500 font-mono">{wifiForm.wifi_password}</p>}
                    </div>
                  ) : <p className="text-sm text-gray-400">Enter network details to see preview</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
