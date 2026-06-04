/**
 * TypeForge AI — Clerk Authentication Module
 * Replaces auth.js with real production authentication.
 */

'use strict';

const CLERK_PUBLISHABLE_KEY = 'pk_test_c3dlZXBpbmctaGVuLTEyLmNsZXJrLmFjY291bnRzLmRldiQ';

// State
let clerkInstance = null;
let currentUser = null;
let clerkLoadingPromise = null;
let authInitPromise = null;

// Parse Clerk Frontend API domain from publishable key to get matched SDK version CDN
function getClerkScriptUrl() {
  try {
    // Publishable key format is typically pk_test_[base64] or pk_live_[base64]
    const parts = CLERK_PUBLISHABLE_KEY.split('_');
    const base64Part = parts[parts.length - 1];
    if (base64Part) {
      const decoded = atob(base64Part);
      // Remove trailing $ if present
      const domain = decoded.endsWith('$') ? decoded.slice(0, -1) : decoded;
      if (domain) {
        return `https://${domain}/npm/@clerk/clerk-js@latest/dist/clerk.browser.js`;
      }
    }
  } catch (e) {
    console.error('TF Auth: Failed to parse Clerk publishable key', e);
  }
  return 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
}

// Ensure Clerk script is loaded
function loadClerkScript() {
  if (clerkLoadingPromise) return clerkLoadingPromise;

  clerkLoadingPromise = new Promise((resolve, reject) => {
    if (window.Clerk) {
      clerkInstance = window.Clerk;
      return resolve(window.Clerk);
    }

    const script = document.createElement('script');
    script.setAttribute('data-clerk-publishable-key', CLERK_PUBLISHABLE_KEY);
    script.async = true;
    script.src = getClerkScriptUrl();

    script.onload = () => {
      clerkInstance = window.Clerk;
      resolve(window.Clerk);
    };
    script.onerror = (e) => {
      clerkLoadingPromise = null; // allow retry
      reject(new Error('Failed to load Clerk script'));
    };
    document.head.appendChild(script);
  });

  return clerkLoadingPromise;
}

function mapClerkUser(clerkUser) {
  if (!clerkUser) return null;
  const firstName = clerkUser.firstName || clerkUser.fullName?.split(' ')?.[0];
  const username = clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress?.split('@')[0];
  return {
    id: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress,
    firstName,
    username,
    name: clerkUser.fullName || firstName || username || 'Typist',
    avatarUrl: clerkUser.imageUrl,
    provider: 'clerk',
    createdAt: clerkUser.createdAt,
  };
}

export const Auth = {
  /**
   * Initialize Auth. Call this on page load. Guaranteed to be safe to call concurrently.
   */
  async init() {
    if (authInitPromise) return authInitPromise;

    authInitPromise = (async () => {
      try {
        const Clerk = await loadClerkScript();
        
        // In the script-tag loading mode, Clerk is instantiated on window.Clerk.
        // It requires a .load() call, but only call if not already loaded.
        if (Clerk && !Clerk.loaded) {
          await Clerk.load();
        }

        if (Clerk && Clerk.user) {
          currentUser = mapClerkUser(Clerk.user);
          updateNavAuthState(currentUser);
          // Sync any local offline sessions to the database
          syncLocalSessions();
        } else {
          currentUser = null;
          updateNavAuthState(null);
        }

        return currentUser;
      } catch (e) {
        console.error('TF Auth: Clerk Init Failed', e);
        authInitPromise = null; // allow retry if failed
        return null;
      }
    })();

    return authInitPromise;
  },

  isAuthenticated() {
    return !!currentUser;
  },

  getInstance() {
    return clerkInstance;
  },

  getUser() {
    return currentUser;
  },

  async getToken() {
    if (!clerkInstance || !clerkInstance.session) return null;
    return await clerkInstance.session.getToken();
  },

  /**
   * Mount or open Sign In modal
   */
  openSignIn() {
    window.location.href = '/login.html';
  },
  openSignUp() {
    window.location.href = '/login.html';
  },

  /**
   * Sign Out
   */
  async signOut() {
    if (clerkInstance) {
      await clerkInstance.signOut();
      currentUser = null;
      updateNavAuthState(null);
      window.location.href = '/index.html';
    }
  }
};

// ── Sync Local Sessions to DB ──────────────────────────────────────
async function syncLocalSessions() {
  try {
    const localHistory = localStorage.getItem('tf_session_history');
    if (!localHistory) return;
    const sessions = JSON.parse(localHistory);
    if (!Array.isArray(sessions) || sessions.length === 0) return;

    console.log(`TF Auth: Found ${sessions.length} local sessions to sync to the server.`);

    // Import API dynamically to avoid circular dependency
    const { API } = await import('./api.js');

    // Send sessions in chronological order (oldest first)
    const sessionsToSync = [...sessions].reverse();

    for (const session of sessionsToSync) {
      try {
        const payload = {
          mode: session.mode || 'classic',
          language: session.language || null,
          duration_secs: session.duration_secs || session.timerDuration || 60,
          text_used: session.text_used || "",
          wpm: Math.round(session.wpm || 0),
          raw_wpm: Math.round(session.raw_wpm || session.wpm || 0),
          accuracy: parseFloat(session.accuracy || 100),
          correct_chars: parseInt(session.correctChars || session.correct_chars || 0),
          error_chars: parseInt(session.errorChars || session.error_chars || 0),
          total_chars: parseInt(session.typedChars || session.total_chars || 0),
          errors: parseInt(session.errors || session.totalErrors || 0),
          consistency: parseFloat(session.consistency || 100),
          max_streak: parseInt(session.maxStreak || session.max_streak || 0),
          key_stats: session.keyStats || session.key_stats || {},
          wpm_history: session.wpmHistory || session.wpm_history || []
        };
        await API.saveSession(payload);
      } catch (err) {
        console.error('TF Auth: Failed to sync local session', err);
      }
    }

    // Once synced, clear local history
    localStorage.removeItem('tf_session_history');
    console.log('TF Auth: Local sessions sync complete.');
  } catch (e) {
    console.error('TF Auth: Error during local sessions sync', e);
  }
}

// ── Nav State Update ───────────────────────────────────────────────
function updateNavAuthState(user) {
  if (user) {
    document.body.classList.add('tf-authenticated');
    // Update avatar initials
    document.querySelectorAll('.nav-user-avatar').forEach(el => {
      el.textContent = (user.name || user.email || 'U').charAt(0).toUpperCase();
      el.title = user.name || user.email;
    });
    // Update avatar images if available
    if (user.avatarUrl) {
      document.querySelectorAll('.nav-user-avatar').forEach(el => {
        const img = document.createElement('img');
        img.src = user.avatarUrl;
        img.alt = user.name;
        img.style.cssText = 'width:100%;height:100%;border-radius:50%;object-fit:cover;';
        img.onerror = () => { el.removeChild(img); };
        el.innerHTML = '';
        el.appendChild(img);
      });
    }
    // Update username displays
    document.querySelectorAll('[data-auth-name]').forEach(el => {
      el.textContent = user.name || 'Typist';
    });
  } else {
    document.body.classList.remove('tf-authenticated');
  }
}

// ── Auto-initialize ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();

  // Wire all [data-auth-signin] elements
  document.querySelectorAll('[data-auth-signin]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); Auth.openSignIn(); });
  });

  // Wire all [data-auth-signout] elements
  document.querySelectorAll('[data-auth-signout]').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); Auth.signOut(); });
  });
});

export default Auth;
