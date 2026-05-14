import axios from 'axios';

// Simple cache to avoid hammering Railway with repeat requests
const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.time < CACHE_TTL) return entry.data;
  return null;
}

export function setCached(key, data) {
  cache[key] = { data, time: Date.now() };
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    // Only auto-redirect on 401 if the user is already logged in (token exists)
    // Never redirect during a login attempt itself
    const isLoginEndpoint = error.config?.url?.includes('/auth/') || error.config?.url?.includes('/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to appropriate login page based on stored role
      const path = window.location.pathname;
      if (path.startsWith('/attendee') || path.startsWith('/techshow')) {
        window.location.href = '/techshow';
      } else {
        window.location.href = '/manage';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
