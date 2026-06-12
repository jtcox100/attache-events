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

// Debounce the 401 redirect — only redirect if we get multiple 401s
// This prevents a single transient error from logging the user out
let consecutiveUnauthorized = 0;
let redirectTimer = null;

api.interceptors.response.use(
  response => {
    consecutiveUnauthorized = 0; // Reset on success
    return response;
  },
  error => {
    const isLoginEndpoint = error.config?.url?.includes('/auth/') || error.config?.url?.includes('/login');
    if (error.response?.status === 401 && !isLoginEndpoint) {
      consecutiveUnauthorized++;
      // Only redirect after 3 consecutive 401s within 10 seconds
      if (consecutiveUnauthorized >= 3) {
        clearTimeout(redirectTimer);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        consecutiveUnauthorized = 0;
        const path = window.location.pathname;
        if (path.startsWith('/attendee') || path.startsWith('/techshow')) {
          window.location.href = '/techshow';
        } else {
          window.location.href = '/manage';
        }
      } else {
        // Reset counter after 10 seconds if no more 401s
        clearTimeout(redirectTimer);
        redirectTimer = setTimeout(() => { consecutiveUnauthorized = 0; }, 10000);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
