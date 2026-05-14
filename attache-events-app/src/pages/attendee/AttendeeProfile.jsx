import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BottomNav from '../../components/BottomNav';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

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

export default function AttendeeProfile() {
  const { user, logout, updateUser } = useAuth();
  const { dark } = useTheme();
  const navigate = useNavigate();

  const [photoUrl, setPhotoUrl] = useState(user?.photo_url || null);
  const [visible, setVisible] = useState(user?.visible_in_directory || false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    title: user?.title || '',
    company: user?.company || '',
    pronouns: user?.pronouns || '',
    headline: user?.headline || '',
    about_me: user?.about_me || '',
    city: user?.city || '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [srcImg, setSrcImg] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const bg = dark ? '#0f172a' : '#f8f8f8';
  const cardBg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';
  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${border}`, backgroundColor: dark ? '#0f172a' : '#fff', color: dark ? '#f1f5f9' : '#1a1a1a', fontSize: 14, boxSizing: 'border-box' };
  const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: 80, fontFamily: 'inherit' };

  function onFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { setSrcImg(reader.result); setShowCropper(true); setCrop(undefined); };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handlePhotoUpload() {
    if (!completedCrop || !imgRef.current) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      const formData = new FormData();
      formData.append('photo', blob, 'profile.jpg');
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendees/me/photo`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const url = data.photo_url + '?t=' + Date.now();
      setPhotoUrl(url); updateUser({ photo_url: url });
      setShowCropper(false); setSrcImg(null);
    } catch (err) { alert(err.message || 'Upload failed'); }
    finally { setUploading(false); }
  }

  async function handleVisibilityToggle() {
    const newVal = !visible;
    setVisible(newVal);
    try {
      const token = localStorage.getItem('token');
      await fetch(`${import.meta.env.VITE_API_URL}/api/attendees/me/profile`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible_in_directory: newVal })
      });
      updateUser({ visible_in_directory: newVal });
    } catch (err) { setVisible(!newVal); }
  }

  function validateForm() {
    const errors = {};
    if (!form.name.trim()) errors.name = 'Name is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true); setSaveMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/attendees/me/profile`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateUser({ name: data.name, title: data.title, company: data.company, pronouns: data.pronouns, headline: data.headline, about_me: data.about_me, city: data.city });
      setEditing(false);
      setSaveMsg('Profile saved');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) { setSaveMsg(err.message || 'Save failed'); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', paddingBottom: 106 }}>
      {/* Header */}
      <div style={{ backgroundColor: dark ? '#1e293b' : '#fff', borderBottom: `1px solid ${border}`, padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>My Profile</h1>
        <button onClick={logout} style={{ fontSize: 13, color: '#9D2235', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Sign out</button>
      </div>

      <div style={{ padding: '1rem' }}>
        {/* Visibility toggle card */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px', color: dark ? '#f1f5f9' : '#1a1a1a' }}>Attendee Directory</p>
            <p style={{ fontSize: 12, color: sub, margin: 0 }}>{visible ? 'Visible to other attendees' : 'Hidden from directory'}</p>
          </div>
          <button onClick={handleVisibilityToggle} style={{
            width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
            backgroundColor: visible ? '#9D2235' : (dark ? '#334155' : '#D5D5D4')
          }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: 3, transition: 'left 0.2s', left: visible ? 27 : 3, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>

        {/* Photo + name card */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem' }}>
            {photoUrl ? (
              <img src={photoUrl} alt="Profile" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #9D2235' }} />
            ) : (
              <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: '#9D2235', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #9D2235' }}>
                <span style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{user?.name?.[0] || '?'}</span>
              </div>
            )}
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 2px' }}>{user?.name}</p>
          {user?.title && <p style={{ fontSize: 13, color: sub, margin: '0 0 1px' }}>{user.title}{user?.pronouns ? ` · ${user.pronouns}` : ''}</p>}
          {user?.company && <p style={{ fontSize: 13, color: sub, margin: '0 0 1px' }}>{user.company}</p>}
          {user?.city && <p style={{ fontSize: 12, color: sub, margin: 0 }}>📍 {user.city}</p>}
          {user?.headline && <p style={{ fontSize: 13, color: dark ? '#94a3b8' : '#374151', margin: '0.5rem 0 0', fontStyle: 'italic' }}>"{user.headline}"</p>}

          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid #9D2235`, backgroundColor: 'transparent', color: '#9D2235', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              📁 Upload photo
            </button>
            <button onClick={() => cameraInputRef.current?.click()} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid #9D2235`, backgroundColor: '#9D2235', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              📷 Take photo
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileSelect} style={{ display: 'none' }} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="user" onChange={onFileSelect} style={{ display: 'none' }} />
        </div>

        {/* QR Badge */}
        <div style={{ backgroundColor: cardBg, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 600, margin: '0 0 0.75rem', color: sub, textTransform: 'uppercase', letterSpacing: '0.05em' }}>My Badge QR</p>
          {user?.qr_code ? (
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(user.qr_code)}`}
              alt="QR code" style={{ width: 140, height: 140, borderRadius: 8, display: 'block', margin: '0 auto' }} />
          ) : <p style={{ color: sub, fontSize: 13 }}>QR code not available</p>}
          <p style={{ fontSize: 11, color: sub, marginTop: '0.5rem' }}>Show at check-in and session entry</p>
        </div>

        {/* Action buttons */}
        {saveMsg && <p style={{ textAlign: 'center', fontSize: 13, color: saveMsg.includes('saved') ? '#2d6a2d' : '#9D2235', marginBottom: '0.5rem' }}>{saveMsg}</p>}
        <button onClick={() => setEditing(true)}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 10, backgroundColor: '#9D2235', border: 'none', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: '0.5rem' }}>
          Edit Profile
        </button>
        <button onClick={logout}
          style={{ width: '100%', padding: '0.75rem', borderRadius: 10, backgroundColor: 'transparent', border: `1px solid #9D2235`, color: '#9D2235', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Sign out
        </button>
      </div>

      {/* Edit Profile modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, overflowY: 'auto' }}>
          <div style={{ backgroundColor: dark ? '#1e293b' : '#fff', margin: '1rem', borderRadius: 12, padding: '1.5rem' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 1.25rem', color: dark ? '#f1f5f9' : '#262D33' }}>Edit Profile</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: dark ? '#94a3b8' : '#374151' }}>Full name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} style={{ ...inputStyle, borderColor: formErrors.name ? '#9D2235' : border }} />
                {formErrors.name && <p style={{ fontSize: 12, color: '#9D2235', margin: '2px 0 0' }}>{formErrors.name}</p>}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: dark ? '#94a3b8' : '#374151' }}>Job title</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={inputStyle} placeholder="e.g. IT Manager" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: dark ? '#94a3b8' : '#374151' }}>Company / Organization</label>
                <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} style={inputStyle} placeholder="e.g. Attache Group Inc." />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: dark ? '#94a3b8' : '#374151' }}>Pronouns</label>
                <input value={form.pronouns} onChange={e => setForm(p => ({ ...p, pronouns: e.target.value }))} style={inputStyle} placeholder="e.g. he/him, she/her, they/them" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: dark ? '#94a3b8' : '#374151' }}>City</label>
                <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} style={inputStyle} placeholder="e.g. London, ON" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: dark ? '#94a3b8' : '#374151' }}>Headline</label>
                <input value={form.headline} onChange={e => setForm(p => ({ ...p, headline: e.target.value }))} style={inputStyle} placeholder="A short tagline about yourself" maxLength={120} />
                <p style={{ fontSize: 11, color: sub, margin: '2px 0 0' }}>{form.headline.length}/120</p>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: dark ? '#94a3b8' : '#374151' }}>About me</label>
                <textarea value={form.about_me} onChange={e => setForm(p => ({ ...p, about_me: e.target.value }))} style={textareaStyle} placeholder="Tell other attendees a bit about yourself..." maxLength={500} />
                <p style={{ fontSize: 11, color: sub, margin: '2px 0 0' }}>{form.about_me.length}/500</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: '0.75rem', borderRadius: 8, border: 'none', backgroundColor: '#9D2235', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setFormErrors({}); }}
                style={{ padding: '0.75rem 1.25rem', borderRadius: 8, border: `1px solid ${border}`, backgroundColor: 'transparent', color: dark ? '#f1f5f9' : '#1a1a1a', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo crop modal */}
      {showCropper && srcImg && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 380 }}>
            <p style={{ fontWeight: 700, fontSize: 16, margin: '0 0 0.5rem', color: '#262D33' }}>Crop your photo</p>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 1rem' }}>Drag to reposition, resize to crop</p>
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1} circularCrop>
              <img ref={imgRef} src={srcImg} onLoad={e => { const {width, height} = e.currentTarget; setCrop(centerAspectCrop(width, height)); }}
                style={{ maxWidth: '100%', maxHeight: 320 }} alt="Crop" />
            </ReactCrop>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button onClick={handlePhotoUpload} disabled={uploading || !completedCrop}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', backgroundColor: '#9D2235', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: uploading ? 0.6 : 1 }}>
                {uploading ? 'Uploading...' : 'Save photo'}
              </button>
              <button onClick={() => { setShowCropper(false); setSrcImg(null); }}
                style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #D5D5D4', backgroundColor: '#fff', fontSize: 14, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
