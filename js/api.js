/**
 * TypeForge AI — Authenticated & Secure API Client
 * Upgraded with Axios interceptors and DOMPurify for XSS protection.
 */
import Auth from './clerk.js?v=2';
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
}, async (error) => {
  const config = error.config;
  
  // If the request failed because the server is unreachable (Network Error / Timeout)
  // and we were targeting localhost:8001, automatically switch to production Render API
  const isLocalhost = config && config.baseURL && (config.baseURL.includes('localhost:8001') || config.baseURL.includes('127.0.0.1:8001'));
  
  if (isLocalhost && !error.response) {
    console.warn("TF API: Local backend at localhost:8001 is unreachable. Automatically falling back to production Render API...");
    const prodBase = 'https://typeforge-tkw8.onrender.com/api/v1';
    
    // Update the instance default base URL for all future requests
    apiClient.defaults.baseURL = prodBase;
    
    // Update this request config base URL and construct the new endpoint
    config.baseURL = prodBase;
    if (config.url && (config.url.startsWith('http://localhost:8001') || config.url.startsWith('http://127.0.0.1:8001'))) {
      config.url = config.url.replace(/https?:\/\/(localhost|127\.0\.0\.1):8001\/api\/v1/, prodBase);
    }
    
    // Retry the request
    try {
      return await apiClient(config);
    } catch (retryErr) {
      return Promise.reject(retryErr);
    }
  }

  // Global Error Handling
  if (error.response) {
    const status = error.response.status;
    const detail = error.response.data?.detail || error.response.data || `HTTP ${status}`;
    // Log detailed error info to console for easier debugging
    console.error(`[TF API] ${config?.method?.toUpperCase()} ${config?.url} → ${status}:`, detail);
    // 401 Unauthorized globally handled
    if (status === 401 && window.location.pathname !== '/login.html') {
      console.warn("API 401: Unauthorized. Redirecting to login...");
      Auth.signOut(); // This will redirect
    }
    return Promise.reject(new Error(typeof detail === 'string' ? detail : JSON.stringify(detail)));
  }
  
  // Network Error / Timeout (Backend is likely cold starting or DATABASE_URL misconfigured)
  console.error(`[TF API] Network/Timeout error for ${config?.method?.toUpperCase()} ${config?.url}. Backend may be starting up or DATABASE_URL is wrong.`);
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
   * Sync Clerk profile (name/email) into Supabase users table
   */
  async syncProfile(userData) {
    return apiClient.post('/users/me/sync-profile', userData);
  },

  /**
   * Update username directly
   */
  async updateUsername(username) {
    return apiClient.patch('/users/me', { username });
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
