import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export function useMessagePolling(onMessage) {
  const { user } = useAuth();
  const onMessageRef = useRef(onMessage);
  const userRef = useRef(user);
  const showingRef = useRef(false);
  const timerRef = useRef(null);

  onMessageRef.current = onMessage;
  userRef.current = user;

  async function fetchAndShow() {
    const u = userRef.current;
    if (!u?.event_id || u.role !== 'attendee') return;

    try {
      const API_URL = import.meta.env.VITE_API_URL;
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/messages/unread/${u.event_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();

      if (data?.length > 0) {
        const msg = data[0];
        showingRef.current = true;

        // Mark as read immediately so it won't show again
        fetch(`${API_URL}/api/messages/${msg.id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        }).catch(() => {});

        // Show message, pass callback to fetch next one on dismiss
        onMessageRef.current(msg.message, () => {
          showingRef.current = false;
          // Check for next message immediately after dismiss
          fetchAndShow();
        });
      } else {
        showingRef.current = false;
        // No messages now — poll again in 60 seconds
        timerRef.current = window.setTimeout(fetchAndShow, 60000);
      }
    } catch {
      showingRef.current = false;
      timerRef.current = window.setTimeout(fetchAndShow, 60000);
    }
  }

  useEffect(() => {
    const initial = window.setTimeout(fetchAndShow, 1000);
    return () => {
      window.clearTimeout(initial);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);
}
