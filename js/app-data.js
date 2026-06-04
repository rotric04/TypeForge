/**
 * Shared app data helpers — profile, history, analytics, badges
 */
import API from './api.js';

export function displayName(user, profile) {
  const fromProfile = profile?.username || profile?.email?.split('@')[0];
  const fromClerk = user?.firstName || user?.name || user?.username;
  return fromProfile || fromClerk || 'Typist';
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
    if (freshHistory && freshHistory.length) {
      history = freshHistory;
    } else {
      // Fallback only to offline unsynced sessions (safety queue)
      history = JSON.parse(localStorage.getItem('tf_session_history') || '[]');
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

export function xpToNextLevel(level, xp) {
  const lvl = Math.max(1, level || 1);
  const xpPrev = (lvl - 1) * 500;
  const xpNext = lvl * 500;
  const cap = xpNext - xpPrev;
  const inLevel = Math.max(0, (xp || 0) - xpPrev);
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
