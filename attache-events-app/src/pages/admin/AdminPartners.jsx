import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/AppHeader';
import api from '../../services/api';

function PartnerModal({ eventId, partner, speakers, onClose, onSave }) {
  const [form, setForm] = useState({
    name: partner?.name || '',
    description: partner?.description || '',
    address: partner?.address || '',
    phone: partner?.phone || '',
    email: partner?.email || '',
  });
  const [selectedSpeakers, setSelectedSpeakers] = useState(
    (partner?.speakers || []).map(s => s.id)
  );
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(partner?.logo_url || null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  function toggleSpeaker(id) {
    setSelectedSpeakers(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  function onLogoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    e.target.value = '';
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setMsg('Company name is required'); return; }
    setSaving(true); setMsg('');
    try {
      let saved;
      if (partner?.id) {
        const { data } = await api.put(`/api/partners/${partner.id}`, form);
        saved = data;
      } else {
        const { data } = await api.post('/api/partners', { event_id: eventId, ...form });
        saved = data;
      }

      // Upload logo if selected
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/partners/${saved.id}/logo`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
        });
        const logoData = await res.json();
        saved.logo_url = logoData.logo_url + '?t=' + Date.now();
      }

      // Save speaker assignments
      await api.put(`/api/partners/${saved.id}/speakers`, { speaker_ids: selectedSpeakers });

      // Attach speakers for display
      saved.speakers = speakers.filter(s => selectedSpeakers.includes(s.id));
      onSave(saved);
      onClose();
    } catch (err) { setMsg(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  }

  const INPUT = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none";
  const BORDER = { borderColor: '#D5D5D4' };
  const LBL = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#262D33', margin: '0 0 1.25rem' }}>
          {partner?.id ? 'Edit Solution Partner' : 'Add Solution Partner'}
        </h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Logo upload */}
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            {logoPreview ? (
              <img src={logoPreview} alt="Logo"
                style={{ height: 64, maxWidth: 200, objectFit: 'contain', margin: '0 auto 0.5rem', display: 'block', border: '1px solid #e5e7eb', borderRadius: 8, padding: 4 }} />
            ) : (
              <div style={{ height: 64, width: 200, margin: '0 auto 0.5rem', border: '2px dashed #D5D5D4', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>No logo uploaded</span>
              </div>
            )}
            <button type="button" onClick={() => fileRef.current?.click()}
              style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #9D2235', color: '#9D2235', backgroundColor: 'transparent', cursor: 'pointer' }}>
              {logoPreview ? 'Change logo' : 'Upload logo'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onLogoSelect} style={{ display: 'none' }} />
          </div>

          <div><label className={LBL}>Company name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={INPUT} style={BORDER} placeholder="e.g. Acme Corp" autoFocus /></div>
          <div><label className={LBL}>Description</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className={INPUT} style={{ ...BORDER, resize: 'vertical' }} placeholder="Brief company description..." /></div>
          <div><label className={LBL}>Address</label><input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={INPUT} style={BORDER} placeholder="123 Main St, London, ON" /></div>
          <div><label className={LBL}>Phone</label><input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={INPUT} style={BORDER} placeholder="519-555-0000" /></div>
          <div><label className={LBL}>Email</label><input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={INPUT} style={BORDER} placeholder="contact@company.com" /></div>

          {/* Speaker assignments */}
          <div>
            <label className={LBL}>Speakers (optional)</label>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 0.5rem' }}>Note: ensure each speaker is correctly associated with this company</p>
            {speakers.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af' }}>No speakers added yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {speakers.map(sp => (
                  <label key={sp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 8px', borderRadius: 6, border: `1px solid ${selectedSpeakers.includes(sp.id) ? '#9D2235' : '#D5D5D4'}`, backgroundColor: selectedSpeakers.includes(sp.id) ? '#fdf0f2' : '#fff' }}>
                    <input type="checkbox" checked={selectedSpeakers.includes(sp.id)} onChange={() => toggleSpeaker(sp.id)} style={{ accentColor: '#9D2235' }} />
                    {sp.photo_url && <img src={sp.photo_url} alt={sp.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />}
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{sp.name}</span>
                    {sp.title && <span style={{ fontSize: 12, color: '#6b7280' }}>{sp.title}</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          {msg && <p style={{ fontSize: 13, color: '#9D2235' }}>{msg}</p>}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="submit" disabled={saving}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', backgroundColor: '#9D2235', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : 'Save'}
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

export default function AdminPartners() {
  const { user } = useAuth();
  const eventId = user?.event_id;
  const [partners, setPartners] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    if (eventId) {
      Promise.all([
        api.get(`/api/partners/event/${eventId}`),
        api.get(`/api/speakers/event/${eventId}`)
      ]).then(([pRes, sRes]) => {
        setPartners(pRes.data || []);
        setSpeakers(sRes.data || []);
      }).catch(console.error)
      .finally(() => setLoading(false));
    }
  }, [eventId]);

  function handleSave(saved) {
    setPartners(prev => {
      const exists = prev.find(p => p.id === saved.id);
      return exists ? prev.map(p => p.id === saved.id ? { ...p, ...saved } : p) : [...prev, saved];
    });
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete solution partner "${name}"?`)) return;
    try {
      await api.delete(`/api/partners/${id}`);
      setPartners(prev => prev.filter(p => p.id !== id));
    } catch (err) { console.error(err); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Solution Partners" backLink="/admin" backLabel="Dashboard" />
      {showModal && (
        <PartnerModal eventId={eventId} partner={editing} speakers={speakers}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSave={handleSave} />
      )}

      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">{partners.length} partner{partners.length !== 1 ? 's' : ''}</p>
          <button onClick={() => { setEditing(null); setShowModal(true); }}
            className="px-4 py-2 text-white text-sm rounded-lg font-semibold"
            style={{ backgroundColor: '#9D2235', border: 'none', cursor: 'pointer' }}>
            + Add Partner
          </button>
        </div>

        {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}
        {!loading && partners.length === 0 && (
          <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: '#D5D5D4' }}>
            <p className="text-gray-400 mb-4">No solution partners added yet</p>
            <button onClick={() => setShowModal(true)} className="px-4 py-2 text-white text-sm rounded-lg" style={{ backgroundColor: '#9D2235', border: 'none', cursor: 'pointer' }}>
              Add your first partner
            </button>
          </div>
        )}

        <div className="space-y-3">
          {partners.map(p => (
            <div key={p.id} className="bg-white rounded-xl border p-4 flex items-start gap-4" style={{ borderColor: '#D5D5D4' }}>
              {p.logo_url ? (
                <img src={p.logo_url} alt={p.name} style={{ width: 64, height: 48, objectFit: 'contain', flexShrink: 0, border: '1px solid #e5e7eb', borderRadius: 6, padding: 4 }} />
              ) : (
                <div style={{ width: 64, height: 48, flexShrink: 0, border: '1px solid #e5e7eb', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' }}>
                  <span style={{ fontSize: 10, color: '#9ca3af' }}>No logo</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{p.name}</p>
                {p.email && <p className="text-xs text-gray-500">{p.email}</p>}
                {p.speakers?.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{p.speakers.length} speaker{p.speakers.length !== 1 ? 's' : ''} assigned</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setEditing(p); setShowModal(true); }}
                  className="text-xs px-3 py-1 border rounded text-gray-600 hover:bg-gray-50" style={{ borderColor: '#D5D5D4' }}>Edit</button>
                <button onClick={() => handleDelete(p.id, p.name)}
                  className="text-xs px-3 py-1 border rounded" style={{ borderColor: '#9D2235', color: '#9D2235' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
