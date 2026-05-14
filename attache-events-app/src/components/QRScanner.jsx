import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export default function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const scannerId = 'qr-scanner-region';
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;
    scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } },
      (decodedText) => { scanner.stop().then(() => onScan(decodedText)).catch(console.error); },
      () => {}
    ).then(() => setStarted(true)).catch(err => { setError('Camera access denied. Please allow camera permissions and try again.'); console.error(err); });
    return () => { if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(console.error); };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, color: '#262D33', margin: 0 }}>Scan QR code</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#666' }}>✕</button>
        </div>
        {error ? (
          <div style={{ padding: '1rem', backgroundColor: '#fdf0f2', borderRadius: 8, color: '#9D2235', fontSize: 14, textAlign: 'center' }}>{error}</div>
        ) : (
          <>
            <div id="qr-scanner-region" style={{ width: '100%', borderRadius: 8, overflow: 'hidden' }} />
            {!started && <p style={{ textAlign: 'center', color: '#666', fontSize: 13, marginTop: '0.5rem' }}>Starting camera...</p>}
            <p style={{ textAlign: 'center', color: '#666', fontSize: 13, marginTop: '0.75rem' }}>Point camera at attendee badge QR code</p>
          </>
        )}
      </div>
    </div>
  );
}
