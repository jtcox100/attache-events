import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/AppHeader';
import QRScanner from '../../components/QRScanner';
import api from '../../services/api';

const TABS = ['Scan', 'Leads'];

export default function VendorLeads() {
  const { user } = useAuth();
  const [tab, setTab] = useState('Scan');
  const [scanInput, setScanInput] = useState('');
  const [scanned, setScanned] = useState(null);
  const [note, setNote] = useState('');
  const [scanError, setScanError] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [leads, setLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => { if (tab === 'Leads') loadLeads(); }, [tab]);

  async function loadLeads() {
    setLoadingLeads(true);
    try { const { data } = await api.get('/api/vendor/leads'); setLeads(data); }
    catch (err) { console.error(err); } finally { setLoadingLeads(false); }
  }

  async function doScan(code) {
    setShowCamera(false); setScanError(''); setScanned(null);
    try { const { data } = await api.get(`/api/vendor/scan/${code.trim()}`); setScanned(data); }
    catch { setScanError('Attendee not found'); }
  }

  async function handleManualScan(e) { e.preventDefault(); await doScan(scanInput.trim()); setScanInput(''); }

  async function handleSave() {
    if (!scanned) return;
    try {
      await api.post('/api/vendor/leads', { attendee_id: scanned.id, event_id: scanned.event_id, note: note.trim() || null });
      setSaveMsg('Lead saved'); setScanned(null); setNote('');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) { setSaveMsg(err.response?.data?.error || 'Save failed'); setTimeout(() => setSaveMsg(''), 3000); }
  }

  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');

  async function handleExport() {
    setExporting(true); setExportMsg('');
    try {
      const { data } = await api.post('/api/vendor/leads/export');
      setExportMsg(data.message);
      setTimeout(() => setExportMsg(''), 5000);
    } catch (err) {
      setExportMsg(err.response?.data?.error || 'Export failed');
      setTimeout(() => setExportMsg(''), 4000);
    } finally { setExporting(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader title={user?.company} />
      {showCamera && <QRScanner onScan={doScan} onClose={() => setShowCamera(false)} />}
      <div className="flex border-b" style={{ borderColor: '#D5D5D4', backgroundColor: '#fff' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className="flex-1 py-3 text-sm font-medium transition-colors"
            style={tab === t ? { color: '#9D2235', borderBottom: '2px solid #9D2235' } : { color: '#666' }}>
            {t} {t === 'Leads' && leads.length > 0 ? `(${leads.length})` : ''}
          </button>
        ))}
      </div>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {tab === 'Scan' && (
          <>
            <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#D5D5D4' }}>
              <p className="text-sm font-medium text-gray-700 mb-3">Scan attendee QR code</p>
              <button onClick={() => setShowCamera(true)} className="w-full py-3 text-white text-sm font-medium rounded-lg mb-3" style={{ backgroundColor: '#9D2235' }}>Open camera to scan</button>
              <div className="flex items-center gap-2 mb-3"><div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">or type manually</span><div className="flex-1 h-px bg-gray-200" /></div>
              <form onSubmit={handleManualScan} className="flex gap-2">
                <input type="text" value={scanInput} onChange={e => setScanInput(e.target.value)} placeholder="Type QR code..."
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none" style={{ borderColor: '#D5D5D4' }} autoComplete="off" />
                <button type="submit" className="px-4 py-2 text-white text-sm rounded-lg" style={{ backgroundColor: '#262D33' }}>Scan</button>
              </form>
              {scanError && <p className="text-sm mt-2" style={{ color: '#9D2235' }}>{scanError}</p>}
            </div>
            {scanned && (
              <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#185676' }}>
                <p className="font-medium" style={{ color: '#262D33' }}>{scanned.name}</p>
                <p className="text-sm text-gray-500">{scanned.email}</p>
                <p className="text-sm text-gray-500 mb-3">{scanned.company}{scanned.title ? ` · ${scanned.title}` : ''}</p>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)..." rows={3}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none mb-3" style={{ borderColor: '#D5D5D4' }} />
                <button onClick={handleSave} className="w-full py-2 text-white text-sm rounded-lg" style={{ backgroundColor: '#9D2235' }}>Save lead</button>
              </div>
            )}
            {saveMsg && <div className="rounded-lg px-4 py-2 text-sm" style={{ backgroundColor: '#f0f7f0', border: '1px solid #c3e6c3', color: '#2d6a2d' }}>{saveMsg}</div>}
          </>
        )}
        {tab === 'Leads' && (
          <>
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">{leads.length} leads captured</p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <button onClick={handleExport} disabled={exporting} className="px-4 py-2 border text-sm rounded-lg text-gray-700" style={{ borderColor: '#D5D5D4', opacity: exporting ? 0.6 : 1 }}>
                  {exporting ? 'Sending...' : 'Email My Leads'}
                </button>
                {exportMsg && <p style={{ fontSize: 12, color: exportMsg.includes('sent') ? '#2d6a2d' : '#9D2235', margin: 0 }}>{exportMsg}</p>}
              </div>
            </div>
            {loadingLeads && <p className="text-sm text-gray-400 text-center py-8">Loading...</p>}
            {!loadingLeads && leads.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No leads yet</p>}
            <div className="space-y-2">
              {leads.map(l => (
                <div key={l.id} className="bg-white rounded-xl border p-4" style={{ borderColor: '#D5D5D4' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#262D33' }}>{l.attendees?.name}</p>
                      <p className="text-xs text-gray-500">{l.attendees?.email} · {l.attendees?.company}{l.attendees?.title ? ` · ${l.attendees?.title}` : ''}</p>
                      {l.note && <p className="text-xs text-gray-600 mt-1 italic">{l.note}</p>}
                    </div>
                    <span className="text-xs text-gray-400">{l.events?.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
