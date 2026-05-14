import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

const HomeIcon = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const ScheduleIcon = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const VendorIcon = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const MoreIcon = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const ProfileIcon = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dark } = useTheme();
  const [showMore, setShowMore] = useState(false);

  const active = (path) => location.pathname === path;
  const activeColor = '#9D2235';
  const inactiveColor = dark ? '#94a3b8' : '#9ca3af';
  const bg = dark ? '#1e293b' : '#ffffff';
  const border = dark ? '#334155' : '#e5e7eb';
  const drawerBg = dark ? '#1e293b' : '#ffffff';

  const tabs = [
    { path: '/attendee', icon: <HomeIcon />, label: 'Home' },
    { path: '/attendee/schedule', icon: <ScheduleIcon />, label: 'Schedule' },
    { path: '/attendee/partners', icon: <VendorIcon />, label: 'Partners' },
  ];

  const moreItems = [
    { path: '/attendee/attendees', label: 'Attendees', emoji: '👥' },
    { path: '/attendee/speakers', label: 'Speakers', emoji: '🎤' },
    { path: '/attendee/wifi', label: 'WiFi Info', emoji: '📶' },
    { path: '/attendee/floorplan', label: 'Floor Plan', emoji: '🗺️' },
  ];

  return (
    <>
      {/* More drawer overlay */}
      {showMore && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowMore(false)}>
          <div style={{
            position: 'fixed', bottom: 90, left: 0, right: 0,
            backgroundColor: drawerBg, borderTop: `1px solid ${border}`,
            borderRadius: '16px 16px 0 0', padding: '1rem',
            zIndex: 50, boxShadow: '0 -4px 20px rgba(0,0,0,0.15)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: border }} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: inactiveColor, marginBottom: '0.5rem', paddingLeft: '0.5rem' }}>More</p>
            {moreItems.map(item => (
              <button key={item.path} onClick={() => { navigate(item.path); setShowMore(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  width: '100%', padding: '0.75rem 0.5rem',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: dark ? '#f1f5f9' : '#1a1a1a',
                  fontSize: 16, textAlign: 'left',
                  borderBottom: `1px solid ${border}`
                }}>
                <span style={{ fontSize: 20 }}>{item.emoji}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nav bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 90,
        backgroundColor: bg, borderTop: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        zIndex: 30, paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        {tabs.map(tab => (
          <button key={tab.path} onClick={() => navigate(tab.path)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              background: 'none', border: 'none', cursor: 'pointer',
              color: active(tab.path) ? activeColor : inactiveColor,
              fontSize: 10, fontWeight: active(tab.path) ? 600 : 400, flex: 1, padding: '8px 0'
            }}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <button onClick={() => setShowMore(s => !s)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: 'none', border: 'none', cursor: 'pointer',
            color: showMore ? activeColor : inactiveColor,
            fontSize: 10, flex: 1, padding: '8px 0'
          }}>
          <MoreIcon />
          More
        </button>
        <button onClick={() => navigate('/attendee/profile')}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: 'none', border: 'none', cursor: 'pointer',
            color: active('/attendee/profile') ? activeColor : inactiveColor,
            fontSize: 10, flex: 1, padding: '8px 0'
          }}>
          <ProfileIcon />
          Profile
        </button>
      </div>
    </>
  );
}
