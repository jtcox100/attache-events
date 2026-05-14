import { useState } from 'react';
import { useMessagePolling } from '../hooks/useMessages';

export default function MessageToast() {
  const [toast, setToast] = useState(null);

  useMessagePolling((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 7000);
  });

  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 999, maxWidth: 340, width: 'calc(100% - 2rem)',
      padding: '0.875rem 1rem', borderRadius: 12, fontSize: 14, fontWeight: 500,
      textAlign: 'center', backgroundColor: '#262D33', color: '#fff',
      boxShadow: '0 4px 24px rgba(0,0,0,0.35)', lineHeight: 1.4,
      cursor: 'pointer'
    }} onClick={() => setToast(null)}>
      {toast}
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Tap to dismiss</div>
    </div>
  );
}
