import { useState, useEffect, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/AppHeader';
import api from '../../services/api';

function centerAspectCrop(w, h) {
  return centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, w, h), w, h);
}

async function getCroppedBlob(image, crop) {
  const canvas = document.createElement('canvas');
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  const size = 300;
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.beginPath(); ctx.arc(size/2, size/2, size/2, 0, Math.PI*2); ctx.clip();
  ctx.drawImage(image, crop.x*scaleX, crop.y*scaleY, crop.width*scaleX, crop.height*scaleY, 0, 0, size, size);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
}

function SpeakerModal({ eventId, speaker, onClose, onSave }) {
  const [form, setForm] = useState({
    name: speaker?.name || '',
    title: speaker?.title || '',
    company: speaker?.company || '',
    bio: speaker?.bio || '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(speaker?.photo_url || null);
  const [srcImg, setSrcImg] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [photoReady, setPhotoReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);
  const imgRef = useRef(null);

  function onPhotoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setSrcImg(reader.result); setShowCropper(true); setCrop(undefined); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setMsg('Name is required'); return; }
    setSaving(true); setMsg('');
    try {
      let saved;
      if (speaker?.id) {
        const { data } = await api.put(`/api/speakers/${speaker.id}`, { ...form });
        saved = data;
      } else {
        const { data } = await api.post('/api/speakers', { event_id: eventId, ...form });
        saved = data;
      }
      // Upload cropped photo if available
      if (photoFile) {
        const formData = new FormData();
        formData.append('photo', photoFile, 'speaker.jpg');
        const token = localStorage.getItem('token');
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/speakers/${saved.id}/photo`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
        });
        const photoData = await res.json();
        saved.photo_url = photoData.photo_url + '?t=' + Date.now();
      }
      onSave(saved);
      onClose();
    } catch (err) { setMsg(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  }

  async function handleCropDone() {
    if (!completedCrop || !imgRef.current) return;
    const blob = await getCroppedBlob(imgRef.current, completedCrop);
    setPhotoFile(blob);
    setPhotoPreview(URL.createObjectURL(blob));
    setShowCropper(false);
    setSrcImg(null);
    setPhotoReady(true);
  }

  const INPUT = "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none";
  const BORDER = { borderColor: '#D5D5D4' };
  const LBL = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#262D33', margin: '0 0 1.25rem' }}>
          {speaker?.id ? 'Edit Speaker' : 'Add Speaker'}
        </h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Photo */}
          <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
            {photoPreview ? (
              <img src={photoPreview} alt="Speaker" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #9D2235', margin: '0 auto 0.5rem', display: 'block' }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#9D2235', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem' }}>
                <span style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{form.name?.[0] || '?'}</span>
              </div>
            )}
            <button type="button" onClick={() => fileRef.current?.click()}
              style={{ fontSize: 12, padding: '4px 12px', borderRadius: 6, border: '1px solid #9D2235', color: '#9D2235', backgroundColor: 'transparent', cursor: 'pointer' }}>
              {photoPreview ? 'Change photo' : 'Upload photo'}
            </button>
            {photoReady && <p style={{ fontSize: 12, color: '#2d6a2d', marginTop: 4 }}>✓ Photo ready — click Save to upload</p>}
            <input ref={fileRef} type="file" accept="image/*" onChange={onPhotoSelect} style={{ display: 'none' }} />
          </div>

          {/* Crop modal */}
          {showCropper && srcImg && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 380 }}>
                <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 0.5rem', color: '#262D33' }}>Crop speaker photo</p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 1rem' }}>Drag to reposition, resize to crop</p>
                <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1} circularCrop>
                  <img ref={imgRef} src={srcImg}
                    onLoad={e => { const {width, height} = e.currentTarget; setCrop(centerAspectCrop(width, height)); }}
                    style={{ maxWidth: '100%', maxHeight: 320 }} alt="Crop" />
                </ReactCrop>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="button" onClick={handleCropDone} disabled={!completedCrop}
                    style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', backgroundColor: '#9D2235', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                    Use this photo
                  </button>
                  <button type="button" onClick={() => { setShowCropper(false); setSrcImg(null); }}
                    style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #D5D5D4', backgroundColor: '#fff', fontSize: 14, cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          <div><label className={LBL}>Full name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={INPUT} style={BORDER} placeholder="Speaker name" autoFocus /></div>
          <div><label className={LBL}>Title</label><input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={INPUT} style={BORDER} placeholder="e.g. VP of Technology" /></div>
          <div><label className={LBL}>Company</label><input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} className={INPUT} style={BORDER} placeholder="e.g. Acme Corp" /></div>
          <div><label className={LBL}>Bio</label><textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={4} className={INPUT} style={{ ...BORDER, resize: 'vertical' }} placeholder="Speaker bio..." /></div>
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

export default function AdminSpeakers() {
  const { user } = useAuth();
  const eventId = user?.event_id;
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { if (eventId) load(); }, [eventId]);

  async function load() {
    try {
      const { data } = await api.get(`/api/speakers/event/${eventId}`);
      setSpeakers(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function handleSave(saved) {
    setSpeakers(prev => {
      const exists = prev.find(s => s.id === saved.id);
      return exists ? prev.map(s => s.id === saved.id ? saved : s) : [...prev, saved];
    });
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete speaker "${name}"? This will remove them from any sessions.`)) return;
    try {
      await api.delete(`/api/speakers/${id}`);
      setSpeakers(prev => prev.filter(s => s.id !== id));
    } catch (err) { console.error(err); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Speakers" backLink="/admin" backLabel="Dashboard" />
      {showModal && <SpeakerModal eventId={eventId} speaker={editing} onClose={() => { setShowModal(false); setEditing(null); }} onSave={handleSave} />}

      <div className="max-w-3xl mx-auto px-6 py-6">
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-500">{speakers.length} speaker{speakers.length !== 1 ? 's' : ''}</p>
          <button onClick={() => { setEditing(null); setShowModal(true); }}
            className="px-4 py-2 text-white text-sm rounded-lg font-semibold"
            style={{ backgroundColor: '#9D2235', border: 'none', cursor: 'pointer' }}>
            + Add Speaker
          </button>
        </div>

        {loading && <p className="text-center text-gray-400 py-8">Loading...</p>}
        {!loading && speakers.length === 0 && (
          <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: '#D5D5D4' }}>
            <p className="text-gray-400 mb-4">No speakers added yet</p>
            <button onClick={() => setShowModal(true)} className="px-4 py-2 text-white text-sm rounded-lg" style={{ backgroundColor: '#9D2235', border: 'none', cursor: 'pointer' }}>
              Add your first speaker
            </button>
          </div>
        )}

        <div className="space-y-3">
          {speakers.map(sp => (
            <div key={sp.id} className="bg-white rounded-xl border p-4 flex items-start gap-4" style={{ borderColor: '#D5D5D4' }}>
              {sp.photo_url ? (
                <img src={sp.photo_url} alt={sp.name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid #9D2235' }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#9D2235', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{sp.name[0]}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{sp.name}</p>
                {(sp.title || sp.company) && (
                  <p className="text-sm text-gray-500">{[sp.title, sp.company].filter(Boolean).join(' · ')}</p>
                )}
                {sp.bio && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{sp.bio}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setEditing(sp); setShowModal(true); }}
                  className="text-xs px-3 py-1 border rounded text-gray-600 hover:bg-gray-50" style={{ borderColor: '#D5D5D4' }}>Edit</button>
                <button onClick={() => handleDelete(sp.id, sp.name)}
                  className="text-xs px-3 py-1 border rounded" style={{ borderColor: '#9D2235', color: '#9D2235' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
