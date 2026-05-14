import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppHeader from '../../components/AppHeader';
import api from '../../services/api';

export default function AdminRegistrations() {
  const { event_id } = useParams();
  const [registrations, setRegistrations] = useState([]);
  const [eventName, setEventName] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [sortField, setSortField] = useState('eventbrite_registered_at');
  const [sortDir, setSortDir] = useState('desc');
  const [editForm, setEditForm] = useState({});
  const [editMsg, setEditMsg] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/api/reports/registrations/${event_id}`),
      api.get(`/api/events/${event_id}`)
    ]).then(([regRes, eventRes]) => {
      setRegistrations(regRes.data || []);
      setEventName(eventRes.data?.name || '');
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, [event_id]);

  function handleSort(field) {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'eventbrite_registered_at' ? 'desc' : 'asc');
    }
  }

  async function handleExport() {
    const token = localStorage.getItem('token');
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/reports/registrations/${event_id}?format=csv`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'registrations.csv';
    a.click();
  }

  function startEdit(a) {
    setEditingId(a.id);
    setEditForm({ name: a.name, email: a.email, company: a.company || '', title: a.title || '' });
    setEditMsg('');
  }

  async function handleSave(id) {
    try {
      const { data } = await api.put(`/api/attendees/${id}`, editForm);
      setRegistrations(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
      setEditingId(null);
      setEditMsg('');
    } catch (err) {
      setEditMsg(err.response?.data?.error || 'Save failed');
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete walk-in attendee "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/attendees/walkin/${id}`);
      setRegistrations(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  }

  async function handleResetEdit(id) {
    if (!window.confirm('Allow Eventbrite sync to overwrite this attendee again?')) return;
    try {
      await api.post(`/api/attendees/${id}/reset-edit`);
      setRegistrations(prev => prev.map(a => a.id === id ? { ...a, manually_edited: false } : a));
    } catch (err) { console.error(err); }
  }

  const sorted = [...registrations].sort((a, b) => {
    let aVal = a[sortField] || '';
    let bVal = b[sortField] || '';
    if (sortField === 'eventbrite_registered_at') {
      aVal = aVal ? new Date(aVal).getTime() : 0;
      bVal = bVal ? new Date(bVal).getTime() : 0;
    } else {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const filtered = sorted.filter(a => {
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      (a.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.company || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ||
      (filter === 'registered' && a.session_count > 0) ||
      (filter === 'none' && a.session_count === 0);
    return matchSearch && matchFilter;
  });

  const totalRegistered = registrations.filter(a => a.session_count > 0).length;
  const totalNone = registrations.filter(a => a.session_count === 0).length;
  const totalEdited = registrations.filter(a => a.manually_edited).length;

  const INPUT = "px-2 py-1 border rounded text-sm focus:outline-none w-full";
  const BORDER = { borderColor: '#D5D5D4' };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Registrations" backLink="/admin" backLabel="Dashboard" />

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-1" style={{ color: '#262D33' }}>{eventName}</h1>
          <div className="flex gap-4 flex-wrap">
            <span className="text-sm text-gray-500">{registrations.length} total attendees</span>
            <span className="text-sm" style={{ color: '#2d6a2d' }}>{totalRegistered} with sessions</span>
            <span className="text-sm text-gray-400">{totalNone} with no sessions</span>
            {totalEdited > 0 && <span className="text-sm" style={{ color: '#9D2235' }}>{totalEdited} manually edited</span>}
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 mb-4 flex flex-wrap gap-3 items-center" style={BORDER}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email or company..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none"
            style={{ ...BORDER, minWidth: 200 }} />
          <div className="flex rounded-lg overflow-hidden border" style={BORDER}>
            {[['all','All'],['registered','Has sessions'],['none','No sessions']].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className="px-3 py-2 text-sm transition-colors"
                style={{ backgroundColor: filter === val ? '#9D2235' : '#fff', color: filter === val ? '#fff' : '#666', borderRight: '1px solid #D5D5D4' }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={handleExport} className="px-4 py-2 text-white text-sm rounded-lg" style={{ backgroundColor: '#262D33' }}>
            Export CSV
          </button>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden" style={BORDER}>
          {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}
          {!loading && filtered.length === 0 && <p className="text-center text-gray-400 py-8">No attendees found</p>}
          {!loading && filtered.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#262D33' }}>
                  {[
                    { label: 'Name', field: 'name' },
                    { label: 'Email', field: 'email' },
                    { label: 'Company', field: 'company' },
                    { label: 'Title', field: null },
                    { label: 'Registered', field: 'eventbrite_registered_at' },
                    { label: 'Sessions', field: null },
                    { label: '', field: null }
                  ].map(({ label, field }) => (
                    <th key={label} className="text-left px-4 py-3 font-semibold" style={{ color: '#fff' }}>
                      {field ? (
                        <button onClick={() => handleSort(field)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
                          {label}
                          <span style={{ opacity: sortField === field ? 1 : 0.4 }}>
                            {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                          </span>
                        </button>
                      ) : label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                    {editingId === a.id ? (
                      <>
                        <td className="px-4 py-2"><input className={INPUT} style={BORDER} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></td>
                        <td className="px-4 py-2"><input className={INPUT} style={BORDER} value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} /></td>
                        <td className="px-4 py-2"><input className={INPUT} style={BORDER} value={editForm.company} onChange={e => setEditForm(p => ({ ...p, company: e.target.value }))} /></td>
                        <td className="px-4 py-2"><input className={INPUT} style={BORDER} value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} /></td>
                        <td className="px-4 py-2 text-gray-400 text-xs">{a.eventbrite_registered_at ? new Date(a.eventbrite_registered_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                        <td className="px-4 py-2"></td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button onClick={() => handleSave(a.id)} className="px-3 py-1 text-xs text-white rounded" style={{ backgroundColor: '#9D2235' }}>Save</button>
                            <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs border rounded text-gray-600" style={BORDER}>Cancel</button>
                          </div>
                          {editMsg && <p className="text-xs mt-1" style={{ color: '#9D2235' }}>{editMsg}</p>}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium" style={{ color: '#262D33' }}>
                          {a.name}
                          {a.manually_edited && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#fdf8ee', color: '#856404' }}>edited</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{a.email}</td>
                        <td className="px-4 py-3 text-gray-500">{a.company || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{a.title || '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                          {a.eventbrite_registered_at ? new Date(a.eventbrite_registered_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {a.session_count === 0 ? (
                            <span className="text-gray-400 text-xs">None</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#f0f7f0', color: '#2d6a2d' }}>
                              {a.session_count} session{a.session_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            <button onClick={() => startEdit(a)} className="text-xs px-3 py-1 border rounded text-gray-600 hover:bg-gray-50" style={BORDER}>Edit</button>
                            {a.manually_edited && (
                              <button onClick={() => handleResetEdit(a.id)} className="text-xs px-2 py-1 border rounded" style={{ borderColor: '#856404', color: '#856404' }}>Reset</button>
                            )}
                            {a.qr_code?.startsWith('WALKIN-') && (
                              <button onClick={() => handleDelete(a.id, a.name)} className="text-xs px-2 py-1 border rounded" style={{ borderColor: '#9D2235', color: '#9D2235' }}>Delete</button>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-right">Showing {filtered.length} of {registrations.length} attendees</p>
      </div>
    </div>
  );
}
