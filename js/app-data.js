/**
 * Shared app data helpers — profile, history, analytics, badges
 */
import API from './api.js';

export function displayName(user, profile) {
  // Helper to check if a string is a Clerk user ID (user_XXXX...) — never show these
  const isClerkId = (s) => !s || s.startsWith('user_');

  // 1. Always prefer Clerk firstName (set by user in Clerk dashboard)
  if (user?.firstName && !isClerkId(user.firstName)) return user.firstName;

  // 2. Clerk fullName
  if (user?.name && !isClerkId(user.name)) return user.name;

  // 3. DB username (if it's a real name, not a Clerk ID)
  if (profile?.username && !isClerkId(profile.username)) return profile.username;

  // 4. Email prefix from DB
  if (profile?.email) {
    const prefix = profile.email.split('@')[0];
    if (!isClerkId(prefix)) return prefix;
  }

  // 5. Clerk username
  if (user?.username && !isClerkId(user.username)) return user.username;

  // 6. Email prefix from Clerk
  if (user?.email) {
    const prefix = user.email.split('@')[0];
    if (!isClerkId(prefix)) return prefix;
  }

  return 'Typist';
}

export function calculateInterSessionConsistency(sessions) {
  if (!Array.isArray(sessions) || sessions.length < 3) return 0;
  // Get last 10 sessions (since history is desc, first 10 are the latest)
  const recent = sessions.slice(0, 10);
  const wpms = recent.map(s => s.wpm || 0);
  const avg = wpms.reduce((a, b) => a + b, 0) / wpms.length;
  if (avg <= 0) return 0;
  const variance = wpms.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / wpms.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / avg) * 100;
  return Math.max(0, Math.min(100, Math.round(100 - cv)));
}


export async function loadProfileAndHistory() {
  let profile = {
    xp: 0,
    level: 1,
    total_sessions: 0,
    best_wpm: 0,
    weak_keys: [],
  };
  let history = [];

  try {
    const freshProfile = await API.getUserProfile();
    if (freshProfile) {
      profile = freshProfile;
    }
  } catch (err) {
    console.error("TF Auth: Failed to load user profile from API", err);
  }

  try {
    const freshHistory = await API.getHistory(60, 0);
    // Only fall back to localStorage if the API call FAILS (throws), not if it returns empty []
    if (freshHistory !== null && freshHistory !== undefined) {
      history = freshHistory; // Could be [] — that's valid and means no DB sessions
    }
  } catch (err) {
    console.error("TF Auth: Failed to load history from API", err);
    // Fallback only to offline unsynced sessions (safety queue)
    history = JSON.parse(localStorage.getItem('tf_session_history') || '[]');
  }

  if (!profile.best_wpm && history.length) {
    profile.best_wpm = Math.max(...history.map((s) => s.wpm || 0));
  }

  return { profile, history };
}

export async function loadDashboardAnalytics() {
  try {
    return await API.getDashboardAnalytics();
  } catch {
    return null;
  }
}

/**
 * Compute XP progress toward next level.
 * Backend level formula: level = FLOOR(SQRT(totalXP / 250)) + 1
 * So XP needed for level N = (N-1)^2 * 250
 *    XP needed for level N+1 = N^2 * 250
 */
export function xpToNextLevel(level, xp) {
  const lvl = Math.max(1, level || 1);
  const totalXp = xp || 0;
  // XP floor/ceiling for this level based on sqrt formula
  const xpForCurrentLevel = (lvl - 1) * (lvl - 1) * 250;  // XP to START this level
  const xpForNextLevel    = lvl * lvl * 250;                // XP to START next level
  const cap    = xpForNextLevel - xpForCurrentLevel;        // XP required for this level
  const inLevel = Math.max(0, totalXp - xpForCurrentLevel); // progress within this level
  return { cap, inLevel, pct: Math.min(100, cap > 0 ? (inLevel / cap) * 100 : 0) };
}

export function personalizeBadge(ach, name) {
  const short = (name || 'You').split(' ')[0];
  const copy = { ...ach };
  if (ach.id === 'first_session') {
    copy.name = `${short}'s First Flight`;
    copy.desc = `Welcome aboard, ${short}. Your journey starts with one session.`;
  } else if (ach.id === 'xp_500') {
    copy.desc = `${short}, you just crossed 500 XP. Momentum is real.`;
  } else if (ach.id === 'level_5') {
    copy.name = `${short} · Rising Star`;
  }
  return copy;
}

export const NEXT_BADGE_HINTS = [
  { id: 'first_session', icon: '🚀', name: 'First Flight', hint: 'Complete your first session' },
  { id: 'wpm_50', icon: '🔥', name: 'Half Century', hint: 'Hit 50 WPM in one run' },
  { id: 'acc_95', icon: '🎯', name: 'Sharp Eyes', hint: 'Reach 95% accuracy' },
  { id: 'sessions_10', icon: '🌱', name: 'Getting Started', hint: 'Finish 10 sessions' },
  { id: 'xp_500', icon: '✨', name: 'XP Spark', hint: 'Earn 500 total XP' },
];
