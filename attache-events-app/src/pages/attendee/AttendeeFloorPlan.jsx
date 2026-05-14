import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import BottomNav from '../../components/BottomNav';
import api from '../../services/api';

export default function AttendeeFloorPlan() {
  const { user } = useAuth();
  const { dark } = useTheme();
  const [event, setEvent] = useState(null);

  useEffect(() => {
    if (user?.event_id) api.get(`/api/events/${user.event_id}`).then(r => setEvent(r.data)).catch(console.error);
  }, [user]);

  const bg = dark ? '#0f172a' : '#f8f8f8';
  const border = dark ? '#334155' : '#e5e7eb';
  const sub = dark ? '#94a3b8' : '#6b7280';

  return (
    <div style={{ backgroundColor: bg, minHeight: '100vh', paddingBottom: 106 }}>
      <div style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderBottom: `1px solid ${border}`, padding: '1rem 1.25rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Floor Plan</h1>
      </div>
      <div style={{ padding: '1rem' }}>
        {!event?.floor_plan_url ? (
          <p style={{ textAlign: 'center', color: sub, padding: '2rem' }}>Floor plan not available yet</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <img src={event.floor_plan_url} alt="Floor plan"
              style={{ width: '100%', borderRadius: 12, border: `1px solid ${border}`, display: 'block' }} />
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
