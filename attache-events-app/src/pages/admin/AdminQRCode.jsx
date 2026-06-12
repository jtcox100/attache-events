import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import AppHeader from '../../components/AppHeader';

export default function AdminQRCode() {
  const { user } = useAuth();
  const canvasRef = useRef(null);
  const APP_URL = 'https://events.attachegroup.com';

  useEffect(() => {
    // Load QRCode library and generate
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    script.onload = () => {
      if (canvasRef.current) {
        canvasRef.current.innerHTML = '';
        new window.QRCode(canvasRef.current, {
          text: APP_URL,
          width: 280,
          height: 280,
          colorDark: '#262D33',
          colorLight: '#ffffff',
          correctLevel: window.QRCode.CorrectLevel.H
        });
      }
    };
    document.head.appendChild(script);
    return () => document.head.removeChild(script);
  }, []);

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="print:hidden">
        <AppHeader title="Event QR Code" backLink="/admin" backLabel="Dashboard" />
      </div>

      <div className="max-w-lg mx-auto px-6 py-8">
        {/* Print button - hidden when printing */}
        <div className="print:hidden mb-6 flex gap-3">
          <button onClick={handlePrint}
            className="flex-1 py-3 rounded-xl text-white font-bold text-base"
            style={{ backgroundColor: '#9D2235', border: 'none', cursor: 'pointer' }}>
            🖨️ Print This Page
          </button>
        </div>

        {/* Printable card */}
        <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: '#D5D5D4' }}
          id="print-card">
          <img src="/attache-logo.png" alt="Attache Group" style={{ height: 48, margin: '0 auto 1.5rem', display: 'block' }} />

          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#262D33', margin: '0 0 0.25rem' }}>
            Welcome to the Event App
          </h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 1.5rem' }}>
            Scan to access sessions, speakers, and more
          </p>

          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 1.5rem' }}>
            <div style={{ padding: 16, border: '2px solid #e5e7eb', borderRadius: 12, display: 'inline-block' }}>
              <div ref={canvasRef} />
            </div>
          </div>

          <p style={{ fontSize: 16, fontWeight: 600, color: '#9D2235', margin: '0 0 0.5rem', letterSpacing: '0.01em' }}>
            events.attachegroup.com
          </p>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
            No app store download required · Works on any phone
          </p>

          <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 8, backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
            <p style={{ fontSize: 13, color: '#374151', margin: '0 0 0.5rem', fontWeight: 600 }}>First time? Here's how:</p>
            <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              1. Scan the QR code above<br />
              2. Select your event and enter your email<br />
              3. Check your email for a password or use Forgot Password<br />
              4. You're in!
            </p>
          </div>
        </div>

        <p className="print:hidden text-xs text-gray-400 text-center mt-4">
          Print multiple copies to place at the registration desk and around the venue
        </p>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          #print-card { border: none; box-shadow: none; max-width: 400px; margin: 2rem auto; }
        }
      `}</style>
    </div>
  );
}
