// Read-only schedule view for vendors and monitors
export default function ScheduleView({ sessions = [] }) {
  const trackColors = {
    general: '#262D33', business: '#0D7B72', technology: '#185676',
    'digital transformation': '#709CBB', lenovo: '#E2231A',
    traditional: '#4A5568', demonstration: '#2563EB',
    'artificial intelligence': '#059669', 'cyber security': '#7C3AED',
  };

  function getTrackColor(track) {
    if (!track) return '#262D33';
    const key = Object.keys(trackColors).find(k => track.toLowerCase().includes(k));
    return key ? trackColors[key] : '#262D33';
  }

  function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Group by start time
  const grouped = sessions.reduce((acc, s) => {
    const key = fmtTime(s.start_time);
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  const sortedTimes = Object.keys(grouped).sort((a, b) => {
    const ta = sessions.find(s => fmtTime(s.start_time) === a)?.start_time;
    const tb = sessions.find(s => fmtTime(s.start_time) === b)?.start_time;
    return new Date(ta) - new Date(tb);
  });

  if (sessions.length === 0) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
      <p>Loading schedule...</p>
    </div>
  );

  return (
    <div style={{ padding: '1rem', paddingBottom: 20 }}>
      {sortedTimes.map(time => (
        <div key={time} style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#9D2235', textTransform: 'uppercase',
            letterSpacing: '0.05em', margin: '0 0 0.5rem', padding: '0 0.25rem' }}>
            {time}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {grouped[time].map(s => {
              const tc = getTrackColor(s.track);
              return (
                <div key={s.session_id || s.id} style={{
                  backgroundColor: '#fff', border: '1px solid #e5e7eb',
                  borderLeft: `3px solid ${tc}`, borderRadius: 8,
                  padding: '0.75rem 1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#262D33', margin: 0, flex: 1 }}>{s.title}</p>
                    {s.track && (
                      <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 8,
                        backgroundColor: tc, color: '#fff', flexShrink: 0 }}>
                        {s.track}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
                    {s.room_name} · {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
                    {s.speaker_name ? ` · ${s.speaker_name}` : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
