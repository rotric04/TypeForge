/**
 * TypeForge AI — Authenticated & Secure API Client
 * Upgraded with Axios interceptors and DOMPurify for XSS protection.
 */
import Auth from './clerk.js';
import axios from 'https://esm.sh/axios@1.6.2';
import DOMPurify from 'https://esm.sh/dompurify@3.0.6';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8001/api/v1'
  : 'https://typeforge-tkw8.onrender.com/api/v1';

// Create Axios Instance
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ── Request Interceptor ──
apiClient.interceptors.request.use(async (config) => {
  // Auto-inject JWT if authenticated
  if (Auth.isAuthenticated()) {
    const token = await Auth.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
}, (error) => Promise.reject(error));

// ── Recursive Sanitizer for JSON Data ──
const sanitizeData = (data) => {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data);
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  if (data !== null && typeof data === 'object') {
    const sanitizedObj = {};
    for (const key in data) {
      sanitizedObj[key] = sanitizeData(data[key]);
    }
    return sanitizedObj;
  }
  return data;
};

// ── Response Interceptor ──
apiClient.interceptors.response.use((response) => {
  // Sanitize all incoming data to prevent XSS payloads from DB/API
  if (response.data) {
    response.data = sanitizeData(response.data);
  }
  return response.data;
}, (error) => {
  // Global Error Handling
  if (error.response) {
    // 401 Unauthorized globally handled
    if (error.response.status === 401 && window.location.pathname !== '/login.html') {
      console.warn("API 401: Unauthorized. Redirecting to login...");
      Auth.signOut(); // This will redirect
    }
    const msg = error.response.data?.detail || `API Error: ${error.response.status}`;
    return Promise.reject(new Error(msg));
  }
  
  // Network Error / Timeout (Backend is likely cold starting)
  return Promise.reject(new Error("Network Error. The servers might be starting up."));
});

export const API = {
  /**
   * Save a typing session to Supabase via FastAPI
   */
  async saveSession(sessionData) {
    return apiClient.post('/sessions/', sessionData);
  },

  /**
   * Verify Cloudflare Turnstile token
   */
  async verifyTurnstile(token) {
    return apiClient.post('/auth/verify-turnstile', { token });
  },

  /**
   * Get current user profile information
   */
  async getUserProfile() {
    return apiClient.get('/users/me');
  },

  /**
   * Get all user achievements
   */
  async getAchievements() {
    return apiClient.get('/users/me/achievements');
  },

  /**
   * Get user session history
   */
  async getHistory(limit = 20, offset = 0) {
    return apiClient.get('/sessions/history', { params: { limit, offset } });
  },

  async getDashboardAnalytics() {
    return apiClient.get('/analytics/dashboard');
  },

  async checkHealth() {
    // Health check uses base URL without /api/v1
    const base = API_BASE.replace(/\/api\/v1\/?$/, '');
    const res = await axios.get(`${base}/health`);
    return res.data;
  },
};

export default API;
