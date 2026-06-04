/**
 * TypeForge AI — Authenticated API Client
 */

import Auth from './clerk.js';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8001/api/v1'
  : 'https://typeforge-tkw8.onrender.com/api/v1';

export const API = {
  /**
   * Base fetch wrapper that auto-injects Clerk JWT
   */
  async fetch(endpoint, options = {}) {
    const headers = new Headers(options.headers || {});
    
    // Auto-inject JWT if authenticated
    if (Auth.isAuthenticated()) {
      const token = await Auth.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const config = {
      ...options,
      headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Error: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Save a typing session to Supabase via FastAPI
   */
  async saveSession(sessionData) {
    return this.fetch('/sessions/', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
  },

  /**
   * Verify Cloudflare Turnstile token
   */
  async verifyTurnstile(token) {
    return this.fetch('/auth/verify-turnstile', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  },

  /**
   * Get current user profile information
   */
  async getUserProfile() {
    return this.fetch('/users/me');
  },

  /**
   * Get all user achievements
   */
  async getAchievements() {
    return this.fetch('/users/me/achievements');
  },

  /**
   * Get user session history
   */
  async getHistory(limit = 20, offset = 0) {
    return this.fetch(`/sessions/history?limit=${limit}&offset=${offset}`);
  },

  async getDashboardAnalytics() {
    return this.fetch('/analytics/dashboard');
  },

  async checkHealth() {
    const base = API_BASE.replace(/\/api\/v1\/?$/, '');
    const res = await fetch(`${base}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },
};

export default API;
