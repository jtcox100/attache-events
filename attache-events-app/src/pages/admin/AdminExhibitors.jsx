import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppHeader from '../../components/AppHeader';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const INPUT = 'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-1';
const BORDER = { borderColor: '#D5D5D4' };

export default function AdminExhibitors() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const eventId = user?.event_id;

  const [exhibitors, setExhibitors] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = add new, id = editing
  const [form, setForm] = useState({ partner_id: '', name: '', title: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventId) {
      Promise.all([
        api.get(`/api/exhibitors/event/${eventId}`),
        api.get(`/api/partners/event/${eventId}`)
      ]).then(([exRes, pRes]) => {
        setExhibitors(exRes.data || []);
        setPartners(pRes.data || []);
      }).catch(console.error)
      .finally(() => setLoading(false));
    }
  }, [eventId]);

  function resetForm() { setForm({ partner_id: '', name: '', title: '' }); setEditing(null); setError(''); }

  function startEdit(ex) {
    setEditing(ex.id);
    setForm({ partner_id: ex.partner_id, name: ex.name, title: ex.title || '' });
    window.scrollTo(0, 0);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.partner_id) { setError('Please select a solution partner'); return; }
    if (!form.name.trim()) { setError('Name is required'); return; }
    setError('');
    try {
      if (editing) {
        const { data } = await api.put(`/api/exhibitors/${editing}`, form);
        setExhibitors(prev => prev.map(ex => ex.id === editing ? data : ex));
        setMsg('Exhibitor updated');
      } else {
        const { data } = await api.post('/api/exhibitors', { ...form, event_id: eventId });
        setExhibitors(prev => [...prev, data]);
        setMsg('Exhibitor added');
      }
      resetForm();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setError(err.response?.data?.error || 'Failed to save'); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this exhibitor?')) return;
    try {
      await api.delete(`/api/exhibitors/${id}`);
      setExhibitors(prev => prev.filter(ex => ex.id !== id));
    } catch { setError('Failed to delete'); }
  }


  // Group exhibitors by partner
  const grouped = exhibitors.reduce((acc, ex) => {
    const pName = ex.partners?.name || 'Unknown';
    if (!acc[pName]) acc[pName] = { partner: ex.partners, items: [] };
    acc[pName].items.push(ex);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Exhibitors" backLink="/admin" backLabel="Dashboard" />

      <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Left — form */}
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#D5D5D4' }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>
            {editing ? 'Edit Exhibitor' : 'Add Exhibitor'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Solution Partner</label>
              <select value={form.partner_id} onChange={e => setForm(p => ({ ...p, partner_id: e.target.value }))}
                className={INPUT} style={BORDER} required>
                <option value="">Select partner...</option>
                {partners.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                className={INPUT} style={BORDER} placeholder="e.g. Jane Smith" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-gray-400 font-normal">(optional)</span></label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className={INPUT} style={BORDER} placeholder="e.g. Account Executive" />
            </div>

            {error && <p className="text-sm font-medium" style={{ color: '#9D2235' }}>{error}</p>}
            {msg && <p className="text-sm font-medium" style={{ color: '#2d6a2d' }}>{msg}</p>}

            <div className="flex gap-2 pt-1">
              <button type="submit" className="flex-1 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ backgroundColor: '#9D2235', border: 'none', cursor: 'pointer' }}>
                {editing ? 'Save Changes' : 'Add Exhibitor'}
              </button>
              {editing && (
                <button type="button" onClick={resetForm}
                  className="px-4 py-2 rounded-lg text-sm font-medium border"
                  style={{ borderColor: '#D5D5D4', color: '#6b7280', backgroundColor: '#fff', cursor: 'pointer' }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Right — list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: '#262D33' }}>
              Exhibitors ({exhibitors.length})
            </h2>

          </div>

          {loading ? (
            <p className="text-sm text-gray-400">Loading...</p>
          ) : exhibitors.length === 0 ? (
            <div className="bg-white rounded-xl border p-6 text-center" style={{ borderColor: '#D5D5D4' }}>
              <p className="text-gray-400 text-sm">No exhibitors added yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([partnerName, { partner, items }]) => (
                <div key={partnerName} className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: '#D5D5D4' }}>
                  {/* Partner header */}
                  <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {partner?.logo_url && (
                      <img src={partner.logo_url} alt={partnerName} style={{ height: 24, objectFit: 'contain' }} />
                    )}
                    <p className="text-sm font-semibold" style={{ color: '#262D33' }}>{partnerName}</p>
                    <span className="text-xs text-gray-400 ml-auto">{items.length} exhibitor{items.length !== 1 ? 's' : ''}</span>
                  </div>
                  {/* Exhibitor rows */}
                  {items.map((ex, i) => (
                    <div key={ex.id} className="flex items-center justify-between px-4 py-3"
                      style={{ borderBottom: i < items.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#262D33' }}>{ex.name}</p>
                        {ex.title && <p className="text-xs text-gray-400">{ex.title}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(ex)}
                          className="text-xs px-3 py-1.5 border rounded-lg"
                          style={{ borderColor: '#D5D5D4', color: '#374151', cursor: 'pointer' }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(ex.id)}
                          className="text-xs px-3 py-1.5 border rounded-lg"
                          style={{ borderColor: '#9D2235', color: '#9D2235', cursor: 'pointer' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
