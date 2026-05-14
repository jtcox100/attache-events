import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/AppHeader';
import api from '../../services/api';

export default function AdminMessages() {
  const { user } = useAuth();
  const eventId = user?.event_id;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { if (eventId) load(); }, [eventId]);

  async function load() {
    try {
      const { data } = await api.get(`/api/messages/admin/${eventId}`);
      setMessages(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) { setMsg('Message text is required'); return; }
    if (!schedDate || !schedTime) { setMsg('Please set a date and time'); return; }
    const scheduled_at = new Date(`${schedDate}T${schedTime}`).toISOString();
    if (new Date(scheduled_at) < new Date()) { setMsg('Scheduled time must be in the future'); return; }
    setSending(true); setMsg('');
    try {
      await api.post('/api/messages', { event_id: eventId, message: text.trim(), scheduled_at });
      setText(''); setSchedDate(''); setSchedTime('');
      setMsg('Message scheduled!');
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed'); }
    finally { setSending(false); }
  }

  async function handleSendNow(e) {
    e.preventDefault();
    if (!text.trim()) { setMsg('Message text is required'); return; }
    setSending(true); setMsg('');
    try {
      // Schedule 1 second in future so cron picks it up immediately
      const scheduled_at = new Date(Date.now() + 1000).toISOString();
      const { data } = await api.post('/api/messages', { event_id: eventId, message: text.trim(), scheduled_at });
      // Mark as sent immediately
      await api.post(`/api/messages/${data.id}/sent`);
      setText('');
      setMsg('Message sent!');
      load();
      setTimeout(() => setMsg(''), 3000);
    } catch (err) { setMsg(err.response?.data?.error || 'Failed'); }
    finally { setSending(false); }
  }

  async function handleDeleteAll() {
    const sent = messages.filter(m => m.sent_at);
    if (!window.confirm(`Delete all ${sent.length} sent messages? This cannot be undone.`)) return;
    try {
      await Promise.all(sent.map(m => api.delete(`/api/messages/${m.id}`)));
      setMessages(prev => prev.filter(m => !m.sent_at));
    } catch (err) { console.error(err); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/api/messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch (err) { console.error(err); }
  }

  const scheduled = messages.filter(m => !m.sent_at);
  const sent = messages.filter(m => m.sent_at);

  function formatTime(iso) {
    return new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title="Broadcast Messages" backLink="/admin" backLabel="Dashboard" />
      <div className="max-w-2xl mx-auto px-6 py-6">

        {/* Compose */}
        <div className="bg-white rounded-xl border p-6 mb-6" style={{ borderColor: '#D5D5D4' }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>New Message</h2>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
                placeholder="e.g. Lunch is now being served in the main hall..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none resize-none"
                style={{ borderColor: '#D5D5D4' }} maxLength={280} />
              <p className="text-xs text-gray-400 mt-1">{text.length}/280</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" style={{ borderColor: '#D5D5D4' }} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none" style={{ borderColor: '#D5D5D4' }} />
              </div>
            </div>
            {msg && <p className="text-sm font-medium" style={{ color: msg.includes('!') ? '#2d6a2d' : '#9D2235' }}>{msg}</p>}
            <div className="flex gap-3">
              <button onClick={handleSendNow} disabled={sending} type="button"
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: '#262D33', border: 'none', cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>
                Send Now
              </button>
              <button onClick={handleSend} disabled={sending} type="button"
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: '#9D2235', border: 'none', cursor: 'pointer', opacity: sending ? 0.6 : 1 }}>
                Schedule
              </button>
            </div>
          </form>
        </div>

        {/* Scheduled */}
        {scheduled.length > 0 && (
          <div className="bg-white rounded-xl border p-6 mb-6" style={{ borderColor: '#D5D5D4' }}>
            <h2 className="text-base font-semibold mb-4" style={{ color: '#262D33' }}>
              Scheduled <span className="text-sm font-normal text-gray-500">({scheduled.length})</span>
            </h2>
            <div className="space-y-3">
              {scheduled.map(m => (
                <div key={m.id} className="flex items-start justify-between gap-3 p-3 rounded-lg" style={{ backgroundColor: '#fef9ee', border: '1px solid #f59e0b' }}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{m.message}</p>
                    <p className="text-xs text-gray-500 mt-1">📅 Scheduled for {formatTime(m.scheduled_at)}</p>
                  </div>
                  <button onClick={() => handleDelete(m.id)}
                    className="text-xs px-2 py-1 border rounded shrink-0" style={{ borderColor: '#9D2235', color: '#9D2235' }}>
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sent */}
        <div className="bg-white rounded-xl border p-6" style={{ borderColor: '#D5D5D4' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold" style={{ color: '#262D33' }}>
              Sent <span className="text-sm font-normal text-gray-500">({sent.length})</span>
            </h2>
            {sent.length > 0 && (
              <button onClick={handleDeleteAll} className="text-xs px-3 py-1 rounded border" style={{ borderColor: '#9D2235', color: '#9D2235', cursor: 'pointer', background: 'transparent' }}>
                Delete All
              </button>
            )}
          </div>
          {loading && <p className="text-sm text-gray-400">Loading...</p>}
          {!loading && sent.length === 0 && <p className="text-sm text-gray-400">No messages sent yet</p>}
          <div className="space-y-3">
            {sent.map(m => (
              <div key={m.id} className="p-3 rounded-lg" style={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
                <p className="text-sm text-gray-900">{m.message}</p>
                <p className="text-xs text-gray-400 mt-1">✓ Sent {formatTime(m.sent_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
