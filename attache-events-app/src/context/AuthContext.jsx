import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize synchronously to avoid loading flicker that remounts children
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (stored && token) return JSON.parse(stored);
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(false);

  async function login(endpoint, payload) {
    // Clear any existing session before attempting login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    const { data } = await api.post(endpoint, payload);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  }

  function updateUser(updates) {
    const updated = { ...JSON.parse(localStorage.getItem('user') || '{}'), ...updates };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
