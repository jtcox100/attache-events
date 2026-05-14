import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export function useMessagePolling(onMessage) {
  const { user } = useAuth();
  const onMessageRef = useRef(onMessage);
  const userRef = useRef(user);

  onMessageRef.current = onMessage;
  userRef.current = user;

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL;

    async function checkMessages() {
      const u = userRef.current;
      if (!u?.event_id || u.role !== 'attendee') return;
      try {
        const token = localStorage.getItem('token');
        // Use native fetch to bypass extension interference
        const res = await fetch(`${API_URL}/api/messages/unread/${u.event_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.length > 0) {
          onMessageRef.current(data[0].message);
          // Mark as read — fire and forget
          fetch(`${API_URL}/api/messages/${data[0].id}/read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          }).catch(() => {});
        }
      } catch (err) {
        // Silently continue regardless of error
      }
      // Always schedule next check
      window.setTimeout(checkMessages, 30000);
    }

    // Start after a short delay
    const initial = window.setTimeout(checkMessages, 1000);
    return () => window.clearTimeout(initial);
  }, []);
}
