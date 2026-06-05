/**
 * TypeForge AI — Clerk Authentication Module
 * Replaces auth.js with real production authentication.
 */

'use strict';

const CLERK_PUBLISHABLE_KEY = 'pk_live_Y2xlcmsudHlwZWZvcmdlLmZ1biQ';

// State
let clerkInstance = null;
let currentUser = null;
let clerkLoadingPromise = null;
let authInitPromise = null;
let isAuthInitialized = false;

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

// Validate Clerk session
async function validateSession() {
  try {
    if (!clerkInstance) return false;
    const session = clerkInstance.session;
    if (!session) return false;
    if (!clerkInstance.user) return false;
    const token = await session.getToken();
    if (!token) return false;
    return true;
  } catch (e) {
    return false;
  }
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

        if (Clerk) {
          // Listen to session state changes to keep the tf_authenticated cookie in sync.
          // This ensures that when a user logs in (or out), the cookie is updated instantly,
          // avoiding redirect loops and flickering when navigating to the dashboard.
          Clerk.addListener(async ({ session, user }) => {
            if (session && user) {
              document.cookie = "tf_authenticated=true; path=/; max-age=31536000; SameSite=Lax; Secure";
            } else {
              // Only act if auth initialization has completed. During init, we don't want to clear the cookie prematurely.
              if (isAuthInitialized) {
                // Wait 1 second to see if this is just a transient loading state or token refresh
                await new Promise(r => setTimeout(r, 1000));
                // Double check if session/user is still missing before acting
                if (!clerkInstance?.session || !clerkInstance?.user) {
                  if (document.cookie.includes('tf_authenticated=true')) {
                    Auth.triggerEmergencyLogout("Session expired. Redirecting to homepage...");
                  } else {
                    document.cookie = "tf_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure";
                  }
                }
              }
            }
          });

          // Heartbeat validator every 60 seconds
          setInterval(async () => {
            if (currentUser && window.location.hostname !== 'localhost') {
              const ok = await validateSession();
              if (!ok) {
                Auth.triggerEmergencyLogout("Session authentication failed.");
              }
            }
          }, 60000);
        }

        if (Clerk && Clerk.user) {
          currentUser = mapClerkUser(Clerk.user);
          // Set cookie for instant client-side route guards
          document.cookie = "tf_authenticated=true; path=/; max-age=31536000; SameSite=Lax; Secure";
          updateNavAuthState(currentUser);
          // Save in localStorage for instant UI rendering on load
          localStorage.setItem('tf_cached_profile', JSON.stringify(currentUser));
          // Sync Clerk profile (name/email) into Supabase so display name is always correct
          syncProfileToDatabase(Clerk.user);
          // Sync any local offline sessions to the database
          syncLocalSessions();
        } else {
          currentUser = null;
          // Clear cookie
          document.cookie = "tf_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure";
          localStorage.removeItem('tf_cached_profile');
          updateNavAuthState(null);
        }

        isAuthInitialized = true;
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

  emergencyTriggered: false,

  async triggerEmergencyLogout(message = "Session expired. Redirecting to homepage...") {
    if (Auth.emergencyTriggered) return;
    Auth.emergencyTriggered = true;
    console.warn("TF Fail Safe: Triggered emergency sign out. Reason:", message);

    try {
      const { showToast } = await import('./common.js');
      showToast({
        title: "Session Expired",
        desc: message,
        type: "warning",
        duration: 3000
      });
    } catch (e) {
      console.warn("TF Fail Safe: Could not show toast notification.", e);
    }

    setTimeout(async () => {
      await Auth.emergencyLogout();
    }, 2000);
  },

  async emergencyLogout() {
    try {
      if (clerkInstance) {
        await clerkInstance.signOut();
      }
    } catch (e) {}

    sessionStorage.clear();
    localStorage.clear();

    // Clear authenticated routing cookie
    document.cookie = "tf_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure";

    window.location.replace("/");
  },

  /**
   * Mount or open Sign In modal
   */
  openSignIn() {
    window.location.href = '/login';
  },
  openSignUp() {
    window.location.href = '/login';
  },

  /**
   * Sign Out
   */
  async signOut() {
    if (clerkInstance) {
      // Clear authenticated routing cookie
      document.cookie = "tf_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax; Secure";

      // Purge all user-specific progress cache in localStorage to prevent data bleed
      localStorage.removeItem('tf_xp');
      localStorage.removeItem('tf_level');
      localStorage.removeItem('tf_sessions');
      localStorage.removeItem('tf_session_history');
      localStorage.removeItem('tf_key_stats');
      localStorage.removeItem('tf_cached_profile');

      await clerkInstance.signOut();
      currentUser = null;
      updateNavAuthState(null);
      window.location.href = '/';
    }
  }
};

// ── Sync Clerk Profile to Supabase ────────────────────────────────
async function syncProfileToDatabase(clerkUser) {
  try {
    if (!clerkUser) return;
    const firstName = clerkUser.firstName || '';
    const lastName = clerkUser.lastName || '';
    const email = clerkUser.primaryEmailAddress?.emailAddress || '';
    const username = clerkUser.username || '';
    // Only sync if we have something meaningful to save
    if (!firstName && !lastName && !username && !email) return;
    const apiModule = await import('./api.js');
    const api = apiModule.default || apiModule.API;
    await api.syncProfile({ firstName, lastName, email, username });
  } catch (e) {
    // Non-critical — fail silently, name will still show from Clerk object
    console.warn('TF Auth: Could not sync profile to DB', e?.message || e);
  }
}

// ── Sync Local Sessions to DB ──────────────────────────────────────
async function syncLocalSessions() {
  try {
    const localHistory = localStorage.getItem('tf_session_history');
    if (!localHistory) return;
    const sessions = JSON.parse(localHistory);
    if (!Array.isArray(sessions) || sessions.length === 0) {
      // Clean up empty array to keep storage tidy
      localStorage.removeItem('tf_session_history');
      return;
    }

    // Only sync sessions with a local_ prefix (truly offline sessions, not DB-cached ones)
    const offlineSessions = sessions.filter(s => String(s.id || '').startsWith('local_'));
    const alreadySynced = sessions.filter(s => !String(s.id || '').startsWith('local_'));

    if (offlineSessions.length === 0) {
      // All sessions are already in DB — clear the local cache, DB is source of truth
      localStorage.removeItem('tf_session_history');
      return;
    }

    console.log(`TF Auth: Found ${offlineSessions.length} offline session(s) to sync to the server.`);

    // Import API dynamically to avoid circular dependency
    const apiModule = await import('./api.js');
    const api = apiModule.default || apiModule.API;

    // Send sessions in chronological order (oldest first)
    const sessionsToSync = [...offlineSessions].reverse();

    const remaining = [];
    let synced = 0;

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
        await api.saveSession(payload);
        synced++;
      } catch (err) {
        console.error('TF Auth: Failed to sync local session', err);
        remaining.push(session);
      }
    }

    if (remaining.length > 0) {
      // Keep only the ones that failed to sync
      localStorage.setItem('tf_session_history', JSON.stringify(remaining.slice(0, 100)));
      console.warn(`TF Auth: ${remaining.length} session(s) still local (API/DB unavailable).`);
    } else {
      // All offline sessions synced — clear local cache entirely (DB is now source of truth)
      localStorage.removeItem('tf_session_history');
      console.log(`TF Auth: All ${synced} offline session(s) synced. Local cache cleared.`);
    }
  } catch (e) {
    console.error('TF Auth: Error during local sessions sync', e);
  }
}

// ── Nav State Update ───────────────────────────────────────────────
function updateNavAuthState(user) {
  if (user) {
    document.body.classList.add('tf-authenticated');
    // Update avatar initials
    const initials = (user.name || user.email || 'U').charAt(0).toUpperCase();
    document.querySelectorAll('.nav-user-avatar, #nav-avatar').forEach(el => {
      el.textContent = initials;
      el.title = user.name || user.email;
    });
    // Update avatar images if available
    if (user.avatarUrl) {
      document.querySelectorAll('.nav-user-avatar, #nav-avatar').forEach(el => {
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

// Global JS Error Handler
window.addEventListener("error", (event) => {
  if (!isAuthInitialized) return;
  // Ignore cross-origin third-party script errors
  if (event.filename && !event.filename.includes(window.location.hostname) && !event.filename.includes('clerk')) {
    return;
  }
  // Only trigger emergency logout for critical auth/core file exceptions or specific auth messages
  const isAuthOrCore = event.filename && (event.filename.includes('clerk.js') || event.filename.includes('api.js'));
  const isAuthMessage = event.message && (event.message.includes('Clerk') || event.message.includes('Auth') || event.message.includes('Unauthorized') || event.message.includes('401'));
  
  if (isAuthOrCore || isAuthMessage) {
    Auth.triggerEmergencyLogout("An unexpected authentication error occurred.");
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (!isAuthInitialized) return;
  const reason = event.reason?.stack || String(event.reason || '');
  const message = event.reason?.message || String(event.reason || '');
  
  // Ignore harmless connection/network/timeout errors
  if (message.includes('Network Error') || message.includes('timeout') || message.includes('Failed to fetch') || message.includes('HTTP 5')) {
    return;
  }
  
  if (reason.includes('clerk') || reason.includes('api.js') || reason.includes('app-data.js')) {
    // Only trigger emergency logout for actual auth failures or TypeError/ReferenceError in core modules
    const isAuthFailure = reason.includes('Unauthorized') || reason.includes('401') || reason.includes('token') || reason.includes('JWT') || reason.includes('signature') || reason.includes('User profile not found');
    const isCriticalCrash = reason.includes('TypeError') || reason.includes('ReferenceError');
    
    if (isAuthFailure || isCriticalCrash) {
      Auth.triggerEmergencyLogout("A critical app request failed.");
    }
  }
});

export default Auth;
