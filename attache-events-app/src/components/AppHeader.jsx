import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { admin: 'Admin', attendee: 'Attendee', monitor: 'Room Monitor', vendor: 'Vendor' };

export default function AppHeader({ title, backLink, backLabel }) {
  const { user, logout } = useAuth();
  return (
    <div className="bg-white border-b px-4 py-3 flex items-center justify-between" style={{ borderColor: '#D5D5D4' }}>
      <div className="flex items-center gap-4">
        {backLink && <a href={backLink} className="text-sm font-medium" style={{ color: '#9D2235' }}>← {backLabel || 'Back'}</a>}
        <img src="/attache-logo.png" alt="Attache Group" className="h-8 w-auto" />
        {title && <span className="text-sm font-medium text-gray-500 hidden sm:block">— {title}</span>}
      </div>
      <div className="flex items-center gap-3">
        {user && <span className="text-xs text-gray-500 hidden sm:block">{user.name} · {ROLE_LABELS[user.role]}</span>}
        {user && <button onClick={logout} className="text-xs px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: '#9D2235' }}>Sign out</button>}
      </div>
    </div>
  );
}
